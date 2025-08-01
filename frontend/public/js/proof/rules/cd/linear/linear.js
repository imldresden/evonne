import { controls, createVisContainer } from "../cd-rules.js";
import { utils } from "../../rules.js";
import { throttle } from "../../../../utils/throttle.js";

function f(number) {
    return Fraction(number).toFraction();
}

const tip = {
    xLine: true,
    yLine: true,
    renderer: throttle((x, y) => { 
        d3.selectAll(".text-eq").classed("hl-text", false);
        Object.keys(hl).forEach(d => {
            if (hl[d].evaluate({x, y})) {
                d3.select(`#eq-${d}`).classed("hl-text", true);
                //console.log(`x:${x}, y:${x} intersects with: ${d}`);
            }
        })
    }, 50)
};

const premiseColor = '#80cbc4';
const conclusionColor = '#b89aef';
const unsatColor = '#F78C85';
const plot = 'cd-linear-plot';
const eval_tolerance = 0.001;
const dims = 500;

let struct = {}; // copy of the node/subproof data 
let vars = []; // list of variables. The order of this list determines the order of the solutions, which allows us to "target" which variables will be free in case of infinite solutions.
let frees = []; // the indices of this list correspond to the ids of the dropdowns to select free variables
let hl = {}; // correspondence between equation ids from `struct` and the plotter line (svg) that should be altered when highlighting occurs
let fnPlot; // the function-plot vis object that is initialized by all solution types
let solObj; // copy of the solution in the plot

// gaussian elimination using Fraction.js
function solve(data) {
    function solveEquations(systemInput, singleInput) {
        function extractSolutions(matrix, tolerance, solutionType) {
            if (solutionType === 'unique solution') {
                let solutions = [];
                const numRows = matrix.length;
                const numCols = matrix[0].length;

                // Solve for unique solutions
                for (let i = numRows - 1; i >= 0; i--) {
                    let sum = Fraction(0);
                    for (let j = i + 1; j < numCols - 1; j++) {
                        sum = sum.add(Fraction(matrix[i][j]).mul(Fraction(solutions[j])));
                    }
                    solutions[i] = Fraction(matrix[i][numCols - 1]).sub(sum).div(Fraction(matrix[i][i]));
                }

                return solutions;
            } else if (solutionType === 'infinite solutions') {
                // Handle infinite solutions
                const numCols = matrix[0].length - 1; // excluding the constant column
                let solutions = [];

                matrix.forEach(row => {
                    let equation = [];
                    for (let j = 0; j < numCols; j++) {
                        if (Fraction(row[j]).abs().gt(tolerance)) {
                            equation.push({ c: Fraction(row[j]), v: vars[j] });
                        }
                    }
                    if (equation.length > 0) {
                        equation.push({ c: Fraction(row[numCols]) });
                        solutions.push(equation);
                    }
                });

                return solutions;
            } else {
                return [];
            }
        }

        function analyzeSolutions(matrix) {
            // determines the type of solution based on the echelon form of the matrix

            const numCols = matrix[0].length - 1; // Exclude the constant column
            let free = numCols;
            let hasSolution = true;

            matrix.forEach((row) => {
                let nonZeroFound = false;
                for (let j = 0; j < numCols; j++) {
                    if (!Fraction(row[j]).equals(0)) {
                        free--;
                        nonZeroFound = true;
                        break;
                    }
                }
                if (!nonZeroFound && !Fraction(row[numCols]).equals(0)) {
                    hasSolution = false; // No solution if a row has all zeros and a non-zero constant
                }
            });

            if (!hasSolution) {
                return { type: 'no solution', state: matrix, free: numCols - 2 };
            }
            if (free > 0) {
                return { type: 'infinite solutions', state: matrix, free };
            }
            return { type: 'unique solution', state: matrix, free: 0 };
        }

        const tolerance = 0;
        const augMatrix = structuredClone(systemInput).concat([singleInput[0]]);
        let system = structuredClone(systemInput); // the system that will be reduced, without the conclusion
        let numRows = system.length;
        let numCols = system[0].length;

        // gaussian elimination based on https://matrixcalc.org/slu.html
        let offset = 0;

        for (let i = 0; i < numRows; i++) {
            if (i + offset >= numCols) {
                break; // can't reduce anymore
            }

            if (Fraction(system[i][i + offset]).equals(0)) { // avoids divisions by zero
                let pivot = i;
                for (let k = i + 1; k < numRows; k++) {
                    if (!Fraction(system[k][i + offset]).equals(0)) {
                        pivot = k;
                        break;
                    }
                }

                if (pivot === i) { // no suitable replacement found
                    offset += 1;
                    i -= 1; 
                    continue; 
                }
                [system[i], system[pivot]] = [system[pivot], system[i]];
            }
            
            for (let k = i + 1; k < numRows; k++) {
                let c = Fraction(-1).mul(system[k][i + offset]).div(system[i][i + offset]);
                for (let j = i + offset; j < numCols; j++) {
                    system[k][j] = Fraction(system[k][j]).add(c.mul(system[i][j]));
                }
            }
        }

        const analysis = analyzeSolutions(system);
        const solutions = extractSolutions(system, tolerance, analysis.type);

        return {
            type: analysis.type,
            matrix: augMatrix, // augmented matrix with premises + conclusion
            echelon: system, // the reduced premise-only system
            solutions: solutions,
            free: analysis.free // free variable count for 'infinite solutions'
        };
    
    }
    const systemData = [];
    const singleData = [];
    const header = [...vars, "_rhs"];

    data.premises.forEach(p => {
        const eq = [];
        header.forEach(h => {
            // must compare directly to undefined
            if (p.constraint[h] !== undefined) {
                eq.push(Fraction(p.constraint[h].replace(/\s+/g, '')));
            } else {
                eq.push(Fraction(0));
            }
        });
        systemData.push(eq);
    });

    if (data.conclusion.constraint) {
        const eq = [];
        header.forEach(h => {
            // must compare directly to undefined
            if (data.conclusion.constraint[h] !== undefined) {
                eq.push(Fraction(data.conclusion.constraint[h].replace(/\s+/g, '')));
            } else {
                eq.push(Fraction(0));
            }
        });
        singleData.push(eq);
    } else {
        console.error("no conclusion equation");
    }

    return solveEquations(systemData, singleData);
}

function vis(plot, solution) {
    const container = document.getElementById('explanation-container')
    let vis = document.getElementById(`${plot}-vis`);
    if (vis) {
        vis.innerHTML = ''
    } else {
        vis = document.createElement('div');
        vis.id = `${plot}-vis`;
        container.appendChild(vis);
    }

    vis.innerHTML = `<div id=${plot}> </div>`;

    return visByType(solution);
}

function visByType(solution, domains = false) {
    hl = {};
    const header = document.getElementById('ruleName');
    document.getElementById('question')?.remove();

    const question = document.createElement('a'); 
    question.setAttribute("id", "question");
    question.setAttribute("class", "bar-button");
    question.setAttribute("data-position", "top");
    question.innerHTML = `<i class="material-icons" style="font-size: 23px;margin:5px">help_outline</i>`;
        
    switch (solution.type) {
        case 'unique solution':
            question.setAttribute("data-tooltip", 
                `The conclusion equation shares, (and therefore intersects) <br> 
                the solution of the premise equation system.`
            );
            visualizeUniqueSolution(plot, solution);
            break;
        case 'infinite solutions':
            question.setAttribute("data-tooltip", 
                `The conclusion equation shares (and therefore intersects) <br> 
                the solution of the premise equation system. <br>
                This holds regardless of which variables are selected as free.`
            );
            visualizeEquations(plot, solution, domains);
            break;
        case 'no solution':
            question.setAttribute("data-tooltip", 
                `The premise equation system has no solution, so the lines in the plot <br>
                either don't all intersect in the same point, or an equation will show <br> 
                a false equivalence (i.e., number = other number).`
            );
            visualizeNoSolutions(plot, solution, domains);
            break;
    }
    
    header.appendChild(question);
    M.Tooltip.init(question);
}

function visualizeUniqueSolution(plot, _data) {
    const matrix = _data.matrix;
    const solutions = _data.solutions;
    const select1 = document.getElementById(`var1`).value;
    const select2 = document.getElementById(`var2`).value;

    // set dependent and independent variables
    const index1 = vars.indexOf(select1);
    const index2 = vars.indexOf(select2);
    const independentIndex = index1;
    const dependentIndex = index2;
    const annotations = [
        { x: solutions[independentIndex], text: `${select1} = ${f(solutions[independentIndex])}` },
        { y: solutions[dependentIndex], text: `${select2} = ${f(solutions[dependentIndex])}` }
    ];

    const data = [];
    let skips = 0; 
    matrix.forEach((row, i) => {
        const id = i !== matrix.length - 1 ? struct.premises[i].id : struct.conclusion.id;
        const color = i !== matrix.length - 1 ? premiseColor : conclusionColor;
        // Replace all other variables with their solutions except for the selected free variables
        const adjustedRow = row.slice(0, -1).map((coef, i) => {
            if (i !== independentIndex && i !== dependentIndex) {
                return Fraction(coef).mul(Fraction(solutions[i])); // Use the solved value
            }
            return Fraction(coef); // Keep the coefficient for the free variables
        });

        // Rearrange the equation to solve for the dependent variable
        const dependentCoefficient = adjustedRow[dependentIndex];
        const independentTerm = adjustedRow.reduce((acc, coef, i) => {
            return i !== dependentIndex ? Fraction(acc).add(Fraction(coef).mul(i === independentIndex ? 1 : 0)) : Fraction(acc);
        }, 0);
        const constantTerm = adjustedRow.reduce((acc, coef, i) => {
            return i !== dependentIndex && i !== independentIndex ? Fraction(acc).add(Fraction(coef)) : Fraction(acc);
        }, 0);

        // Construct the function string for function-plot
        const c = Fraction(row[row.length - 1]).sub(Fraction(constantTerm));
        const fn = `(${f(c)} - (${f(independentTerm)})x) / (${f(dependentCoefficient)})`;
        
        if (Fraction(dependentCoefficient).equals(0)) { // can't be expressed as f(x), must use annotation
            if (!Fraction(independentTerm).equals(0)) {
                const v = Fraction(row[row.length - 1]).sub(Fraction(constantTerm)).div(Fraction(independentTerm));
                // f(v) === f(solutions[independentIndex]), could use either
                annotations.push({ x: eval(f(v)), color });
                const ind = annotations.length-1
                hl[id] = { 
                    svg: () => document.querySelectorAll(`#${plot} .annotations path`)[ind], 
                    evaluate: point => 
                        Fraction(v).gt(Fraction(point.x - eval_tolerance)) && 
                        Fraction(v).lt(Fraction(point.x + eval_tolerance)),
                    color 
                };
            } else {
                //console.error('neither of the selected variables can be plotted.')
            }
            skips += 1;
        } else {
            data.push({ fn, color, updateOnMouseMove: false, graphType: 'polyline' });
            const ind = i - skips;
            hl[id] = { 
                svg: () => document.querySelectorAll(`#${plot} .graph path.line`)[Math.max(0, ind)], 
                evaluate: (point) => {
                    const p = Fraction(independentTerm).mul(Fraction(point.x));
                    const s = Fraction(c).sub(p);
                    const d = s.div(Fraction(dependentCoefficient));
                    return d.gt(Fraction(point.y - eval_tolerance)) && d.lt(Fraction(point.y + eval_tolerance));
                },
                color 
            };
        }
    });

    // Make emphasis on the intersection point
    data.push({
        points: [[solutions[independentIndex], solutions[dependentIndex]]],
        fnType: 'points',
        graphType: 'scatter'
    });

    const text = solutions
        .filter(s => !isNaN(s))
        .map((_, i) => {
            if (i !== independentIndex && i !== dependentIndex && solutions[i] !== null) {
                return `${vars[i]} = ${f(solutions[i])}`;
            }
        })
        .filter(e => e).join(', ');

    data.push({
        graphType: 'text',
        location: [solutions[independentIndex], solutions[dependentIndex]],
        text,
        color: 'black'
    });

    // center plot on the intersection point
    const xDomain = [solutions[independentIndex] - 10, solutions[independentIndex] + 10];
    const yDomain = [solutions[dependentIndex] - 10, solutions[dependentIndex] + 10];
    
    // Use function-plot to draw the plot
    const p = functionPlot({
        tip,
        target: `#${plot}`,
        width: dims,
        height: dims,
        xAxis: { label: `${select1}-axis`, domain: xDomain },
        yAxis: { label: `${select2}-axis`, domain: yDomain },
        grid: false,
        data,
        annotations
    });
    document.querySelector('.function-plot .zoom-and-drag').onmouseout = () => d3.selectAll(".text-eq").classed("hl-text", false);

    annotations.forEach((a, i) => {
        if (a.color) {
            document.querySelectorAll(`#${plot} .annotations path`)[i].style.stroke = a.color;
        }
    });

    fnPlot = { plot: p, hl };
}

function getFreeVariables(data) {
    const echelon = data.echelon;
    const numberFree = data.free;
    const dependent = [];
    
    let free = [];
    let offset = 0;
    
    for (let i = 0; i < echelon.length; i++) { 
        if (i + offset >= echelon[0].length) {
            break; // can't reduce anymore
        }

        if (!Fraction(echelon[i][i + offset]).equals(0)) {
            dependent.push(vars[i + offset])
        } else {
            free.push(vars[i + offset]);
            offset += 1;
            i -= 1;
            continue;
        }
    }
    
    if (free.length === 0) {
        free = vars.slice(vars.length -(numberFree));
    }

    
    if (data.type === 'no solution') {
        const select1 = document.querySelector(`#var1`).value;
        const select2 = document.querySelector(`#var2`).value;
        free = vars.filter(v => v !== select1 && v !== select2);
    }

    return { dependent, free }
}

function visualizeEquations(plot, _data, domains = false) {
    const matrix = _data.matrix;
    const { dependent, free } = getFreeVariables(_data);
    const solutions = _data.solutions;
    const independent = {};
    
    free.forEach(varName => {
        const slider = document.getElementById(`slider-${varName}`);
        independent[varName] = parseFloat(slider.value);
        document.getElementById(`sol-${varName}`).innerHTML = `${varName} = ${f(slider.value)}`;
    });

    document.getElementById(plot).innerHTML = '';
    
    const dependentValues = {}; // Store computed values for dependent variables

    // Iterate over solutions in reverse to handle dependencies correctly
    for (let i = solutions.length - 1; i >= 0; i--) {
        const sol = solutions[i];
        const dependentVar = dependent[i];

        let terms = sol.slice(0, -1);
        let constantTerm = sol[sol.length - 1].c;
        let equationParts = [];
        let debug = [];
        let equationPreviewParts = [];
        let dependentCoef;
        
        terms.forEach(term => {
            const coef = term.c;
            const varName = term.v;

            if (varName === dependentVar) {
                dependentCoef = coef; // Coefficient of the dependent variable
            } else {
                let value = independent[varName] || 0; // Default to slider or zero
                
                // If the variable has been solved in this loop, use its calculated value
                if (dependentValues[varName] !== undefined) {
                    value = dependentValues[varName];
                }

                equationParts.push(coef.mul(value));
                equationPreviewParts.push(`${f(coef)}${varName}`);
                debug.push(`(${f(coef)})*(${f(value)})`);
            }
        });

        // Build the function string for preview
        const varName = dependentVar;
        const independentTermsPreview = equationPreviewParts.join(" + ");

        let solved = independentTermsPreview;
        
        if (equationPreviewParts.length !== 0) {
            if (equationPreviewParts.length === 1) {
                solved = ` - ${solved}`;
            } else {
                solved = ` - (${solved})`;
            }        
        } 

        if (constantTerm !== 0) {
            solved = `${f(constantTerm)}${solved}`;
        }

        if (dependentCoef !== 1) {
            solved = `(${solved}) / (${f(dependentCoef)})`;
        }

        // var = const - (rest of eq) / coef
        const solutionPreview = `${varName} = ${solved}`;
        const independentTerms = equationParts.reduce((acc, part) => acc.add(part), Fraction(0));
        
        if (!Fraction(dependentCoef).equals(0)) {
            const s = constantTerm.sub(independentTerms);
            const fn = s.div(dependentCoef);
            document.getElementById(`sol-${varName}`).innerHTML = `${solutionPreview} = ${f(fn)}`;
            dependentValues[dependentVar] = fn; // Store the calculated value
        }
    }

    const select1 = document.querySelector(`#var1`);
    const select2 = document.querySelector(`#var2`);

    const x = { varName: select1.value, fn: dependentValues[select1.value] || independent[select1.value]};
    const y = { varName: select2.value, fn: dependentValues[select2.value] || independent[select2.value] };

    const annotations = [
        { x: eval(f(x.fn)), text: `${x.varName} = ${f(x.fn)}` },
        { y: eval(f(y.fn)), text: `${y.varName} = ${f(y.fn)}` }
    ];

    const data = [];
    let simplified = false; // plot 2D solution + true: only conclusion, false: all equations
    let skips = 0;
    for (let i = 0; i < matrix.length; i++) {
        const id = i !== matrix.length - 1 ? struct.premises[i].id : struct.conclusion.id;
        const color = i !== matrix.length - 1 ? premiseColor : conclusionColor;

        if (simplified && i !== matrix.length - 1) {
            continue; // only plots 2D solution + conclusion equation
        }

        const row = matrix[i];
        const yCoef = row[vars.indexOf(y.varName)];
        const xCoef = row[vars.indexOf(x.varName)];
        const constantTerm = row[row.length - 1];
        let replacedSum = 0;

        // Construct the equation for the dependent variable (y)
        row.slice(0, -1).forEach((coef, idx) => {
            if (!Fraction(coef).equals(0)) {
                let currentVar = vars[idx];
                let value = undefined;

                if (currentVar !== x.varName && currentVar !== y.varName) { // already in xCoef and yCoef 
                    if (independent[currentVar] !== undefined) {
                        value = independent[currentVar];
                    } else {
                        value = dependentValues[currentVar];
                    }
                    replacedSum = Fraction(replacedSum).add(Fraction(coef).mul(Fraction(value)));
                }
            }
        });

        // build the function string for plotter
        const equation = `(${f(constantTerm)} - (${f(xCoef)}x + ${f(replacedSum)})) / (${f(yCoef)})`;

        if (Fraction(yCoef).equals(0)) { // can't be expressed as f(x), must use annotation
            if (!Fraction(xCoef).equals(0)) {
                // solve for x because y is canceled (0f(x)): x = (c - sum)/A 
                
                const v = Fraction(constantTerm).sub(Fraction(replacedSum)).div(Fraction(xCoef));
                annotations.push({ x: eval(f(v)), text: `${x.varName} = ${f(v)}`, color });
                const ind = annotations.length-1;
                hl[id] = { 
                    svg: () => document.querySelectorAll(`#${plot} .annotations path`)[ind], 
                    evaluate: point => 
                        Fraction(v).gt(Fraction(point.x - eval_tolerance)) && 
                        Fraction(v).lt(Fraction(point.x + eval_tolerance)),
                    color
                };
            } else {
                //console.log(equation)
                //console.log('both of the selected variables canceled');
            }
            skips += 1;
        } else {
            data.push({ fn: equation, color, updateOnMouseMove: false, graphType: 'polyline' });
            const ind = i - skips;
            hl[id] = { 
                color,
                svg: () => document.querySelectorAll(`#${plot} .graph path.line`)[Math.max(0, ind)], 
                evaluate: (point) => {
                    const p = Fraction(xCoef).mul(Fraction(point.x)).add(Fraction(replacedSum));
                    const s = Fraction(constantTerm).sub(p);
                    const d = s.div(Fraction(yCoef));
                    return d.gt(Fraction(point.y - eval_tolerance)) && d.lt(Fraction(point.y + eval_tolerance));
                } 
            };
        }
    }

    // center plot on the intersection point
    const doms = { 
        x: [eval(f(x.fn)) - 10, eval(f(x.fn)) + 10], 
        y: [eval(f(y.fn)) - 10, eval(f(y.fn)) + 10]
    }

    let xDomain = doms.x;
    let yDomain = doms.y;
    
    if (domains && !document.getElementById('center-at-sol').checked) {
        xDomain = fnPlot.plot.meta.xScale.domain(); 
        yDomain = fnPlot.plot.meta.yScale.domain(); 
    }

    // Use function-plot to draw the plot
    const params = {
        tip,
        target: `#${plot}`,
        width: dims,
        height: dims,
        xAxis: { label: `${x.varName}-axis`, domain: xDomain }, 
        yAxis: { label: `${y.varName}-axis`, domain: yDomain },
        grid: false,
        data,
        annotations, 
        doms
    };

    document.getElementById(`center-ctrl`).style = 'display:grid';
    const p = functionPlot(params);
    document.querySelector('.function-plot .zoom-and-drag').onmouseout = () => d3.selectAll(".text-eq").classed("hl-text", false);

    annotations.forEach((a, i) => {
        if (a.color) {
            document.querySelectorAll(`#${plot} .annotations path`)[i].style.stroke = a.color;
        }
    });

    fnPlot = { plot: p, hl, params };
}

function visualizeNoSolutions(plot, _data, domains) {
    const matrix = _data.matrix;
    const { free } = getFreeVariables(_data);
    const independent = {};
    
    free.forEach(varName => {
        const slider = document.getElementById(`slider-${varName}`);
        independent[varName] = parseFloat(slider.value);
    });

    document.getElementById(plot).innerHTML = '';

    const select1 = document.querySelector(`#var1`);
    const select2 = document.querySelector(`#var2`);
    const x = { varName: select1.value, fn: independent[select1.value] };
    const y = { varName: select2.value, fn: independent[select2.value] };
    const annotations = [];

    const data = [];
    let skips = 0;
    for (let i = 0; i < matrix.length - 1; i++) {
        document.getElementById(`evEq-${i}`).className = "";
        const id = struct.premises[i].id;
        const color = unsatColor;
        const row = matrix[i];
        const yCoef = row[vars.indexOf(y.varName)];
        const xCoef = row[vars.indexOf(x.varName)];
        const constantTerm = row[row.length - 1];
        let replacedSum = 0;

        // Construct the equation for the dependent variable (y)
        row.slice(0, -1).forEach((coef, idx) => {
            if (!Fraction(coef).equals(0)) {
                let currentVar = vars[idx];
                let value = undefined;

                if (currentVar !== x.varName && currentVar !== y.varName) { // already in xCoef and yCoef
                    value = independent[currentVar]; 
                    replacedSum = Fraction(replacedSum).add(Fraction(coef).mul(Fraction(value)));
                }
            }
        });

        let evaluated = `${f(replacedSum)} = ${f(row[row.length-1])}`;

        // build the function string for plotter
        const equation = `(${f(constantTerm)} - (${f(xCoef)}x + ${f(replacedSum)})) / (${f(yCoef)})`;
        
        if (!Fraction(yCoef).equals(0)) {
            evaluated = `${f(yCoef)}${y.varName} + ` + evaluated;
        }

        if (!Fraction(xCoef).equals(0)) {
            evaluated = `${f(xCoef)}${x.varName} + ` + evaluated;
        }

        document.getElementById(`evEq-${i}`).innerHTML = evaluated;

        if (Fraction(yCoef).equals(0)) { // can't be expressed as f(x), must use annotation
            if (!Fraction(xCoef).equals(0)) {
                
                // solve for x because y is canceled (0f(x)): x = (c - sum)/A 
                
                const v = Fraction(constantTerm).sub(Fraction(replacedSum)).div(Fraction(xCoef));
                annotations.push({ x: eval(f(v)), text: `${x.varName} = ${f(v)}`, color });
                const ind = annotations.length-1;
                hl[id] = { 
                    svg: () => document.querySelectorAll(`#${plot} .annotations path`)[ind], 
                    evaluate: point => 
                        Fraction(v).gt(Fraction(point.x - eval_tolerance)) && 
                        Fraction(v).lt(Fraction(point.x + eval_tolerance)),
                    color
                };
            } else {
                if (!Fraction(replacedSum).equals(Fraction(row[row.length-1]))) {
                    document.getElementById(`evEq-${i}`).className = "text-red";
                }
            }
            skips += 1;
        } else {
            data.push({ fn: equation, color, updateOnMouseMove: false, graphType: 'polyline' });
            const ind = i - skips;
            hl[id] = { 
                color,
                svg: () => document.querySelectorAll(`#${plot} .graph path.line`)[Math.max(0, ind)], 
                evaluate: (point) => {
                    const p = Fraction(xCoef).mul(Fraction(point.x)).add(Fraction(replacedSum));
                    const s = Fraction(constantTerm).sub(p);
                    const d = s.div(Fraction(yCoef));
                    return d.gt(Fraction(point.y - eval_tolerance)) && d.lt(Fraction(point.y + eval_tolerance));
                } 
            };
        }
    }

    // center plot on the intersection point
    const doms = { 
        x: [eval(f(x.fn)) - 10, eval(f(x.fn)) + 10], 
        y: [eval(f(y.fn)) - 10, eval(f(y.fn)) + 10]
    }

    let xDomain = doms.x;
    let yDomain = doms.y;
    
    if (domains) {
        xDomain = fnPlot.plot.meta.xScale.domain(); 
        yDomain = fnPlot.plot.meta.yScale.domain(); 
    }

    // Use function-plot to draw the plot
    const params = {
        tip,
        target: `#${plot}`,
        width: dims,
        height: dims,
        xAxis: { label: `${x.varName}-axis`, domain: xDomain }, 
        yAxis: { label: `${y.varName}-axis`, domain: yDomain },
        grid: false,
        data,
        annotations, 
        doms
    }
    const p = functionPlot(params);

    document.querySelector('.function-plot .zoom-and-drag').onmouseout = () => d3.selectAll(".text-eq").classed("hl-text", false);

    annotations.forEach((a, i) => {
        if (a.color) {
            document.querySelectorAll(`#${plot} .annotations path`)[i].style.stroke = a.color;
        }
    });

    fnPlot = { plot: p, hl, params };
}

function getRelevantVariables(data) {
    if (data.type !== 'no solution') {
        // if there is/are solution(s), we only care about the variables in the conclusion. 
        return vars.filter((_, i) => !Fraction(data.matrix[data.matrix.length - 1][i]).equals(0));
    } 
    return vars;
} 

export class LinearCD {
    showObvious = false;

    createPlotControls(data) {
        function generateVariableSelectors(data) {
            const select1 = document.querySelector(`#var1`);
            const select2 = document.querySelector(`#var2`);
            select1.innerHTML = '';
            select2.innerHTML = '';
            
            const rVars = getRelevantVariables(data);
            rVars.forEach(varName => {
                const opt1 = new Option(varName, varName);
                const opt2 = new Option(varName, varName);

                if (opt2.value === rVars[1]) {
                    opt1.disabled = true;
                }
                if (opt1.value === rVars[0]) {
                    opt2.disabled = true;
                }

                select1.add(opt1);
                select2.add(opt2);
            });

            
            select1.value = rVars[0];
            select2.value = rVars[1];
            if (rVars.length === 1 && vars.length > 1) {
                let other;
                vars
                    .filter((_, i) => Fraction(data.matrix[data.matrix.length - 1][i]).equals(0))
                    .forEach(v => {
                        const opt = new Option(v, v);
                        other = v;
                        select2.add(opt);
                    });
                select2.value = other;
            }
            
            function update(d) {
                const other = d.target.id === "var1" ? `#var2 option` : `#var1 option`;

                document.querySelectorAll(other).forEach(opt => {
                    opt.disabled = false;
                    if (opt.value === d.target.value) {
                        opt.disabled = true;
                    }
                });

                solObj = solve(struct);
                if (solObj.type === 'no solution') {
                    createSliders(solObj);
                }
                visByType(solObj);
            }

            select1.onchange = update;
            select2.onchange = update;
        }

        function createSliders(data) {
            if (data.free <= 0) { return; }

            frees = [];
            const freeVarsContainer = document.getElementById(`slidersContainer`);
            freeVarsContainer.innerHTML = '<div>Other Variables:</div>';
            if (data.type !== 'no solution') {
                freeVarsContainer.innerHTML = '<div>Free Variables:</div>';
            }
            freeVarsContainer.style = 'display:grid';

            const sliders = {};
    
            const { _ , free} = getFreeVariables(data); 
            
            free.forEach((varName, i) => {
                if (sliders[varName] === undefined) {
                    // create slider to specify free variable value
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = '-100';
                    slider.max = '100';
                    slider.value = '0'; // Default value
                    slider.step = '0.001';
                    slider.id = `slider-${varName}`;

                    const label = document.createElement('label');
                    label.id = `label-${varName}`;
                    label.htmlFor = slider.id;
                    label.style = "display:block;margin-left:10px;min-width:150px"
                    label.textContent = `${varName}: 0`;
                    label.addEventListener("dblclick", () => {
                        if (slider.type === 'text') {
                            slider.type = 'range';
                        } else {
                            slider.type = 'text';
                        }
                    });

                    const sliderContainer = document.createElement('div');
                    sliderContainer.style = "display:inline-block;width:200px";
                    sliderContainer.appendChild(label);
                    sliderContainer.appendChild(slider);

                    // add to controls 
                    const varContainer = document.createElement('div');
                    varContainer.style = "display: inline-flex";

                    if (data.type !== 'no solution') {
                        // create select to replace free variable
                        const select = document.createElement('select');
                        select.id = `select-free-${i}`;
                        select.style = "display:block;";
                        vars.forEach(v => select.add(new Option(v, v)));
                        select.value = varName;
                        
                        select.onchange = (d) => {
                            const idx = +d.target.id.split('select-free-')[1];
                            const previous = frees[idx];

                            for (let i = 0; i < frees.length; i++) {
                                if (frees[i] === d.target.value && i !== idx) {
                                    frees[i] = previous;
                                }
                            }

                            frees[idx] = d.target.value;
                            const comp = vars.filter(v => !frees.includes(v));
                            vars = [...comp, ...frees];
                            solObj = solve(struct);
                            createSliders(solObj);
                            visByType(solObj);
                        }

                        varContainer.appendChild(select);
                    }
                    
                    varContainer.appendChild(sliderContainer);
                    freeVarsContainer.appendChild(varContainer);

                    // interaction 
                    slider.oninput = () => {
                        sliders[varName] = Fraction(slider.value);
                        label.textContent = `${varName}: ${slider.value}`;
                        
                        visByType(data, true);
                    };

                    sliders[varName] = Fraction(slider.value);
                    frees.push(varName);
                }
            });

            return sliders;
        }

        const container = document.getElementById('explanation-container');
        container.style = `min-height:400px;margin-top:15px;display:flex;height:${dims+20}px`;
        container.innerHTML = '';

        const ctrls = document.createElement('div');
        container.appendChild(ctrls);
        ctrls.innerHTML =
            `<div id="linear-vis-controls" 
                style="display:inline-block;
                        min-width:250px;
                        padding-left:25px;
                        padding-right:25px;
                        max-height:${dims}px;
                        overflow-y:auto">
                <div> Plot Axes: </div>
                <label id="l-var1" for="var1">&nbsp;X-axis:</label>
                <select id="var1" class="browser-default"></select>
                <label id="l-var2" for="var2">&nbsp;Y-axis:</label>
                <select id="var2" class="browser-default"></select>
                &nbsp;
                <div id="slidersContainer" style="display: none;"> </div>
                &nbsp;
                <div id="center-ctrl" style="display: none;"> 
                    <label>
                        <input id="center-at-sol" type="checkbox" class="filled-in" />
                        <span>Center at solution</span>
                    </label>
                </div>
            </div>`;

        generateVariableSelectors(data);
        createSliders(data);
        document.getElementById('center-at-sol').addEventListener("change", e => { 
            visByType(solBkp);
        })
    }

    draw(data, params, where) {
        function getVariables(data) {
            const premises = data.premises.map(p => Object.keys(p.constraint)).flat(1);
            let s;
            if (!data.conclusion.constraint.bottom) {
                s = new Set([...premises, ...Object.keys(data.conclusion.constraint)]);
            } else {
                s = new Set([...premises]);
            }

            s.delete("_rhs");
            s.delete("_asserted");
            return Array.from(s);
        }

        function displayEquationSystem(op, variables) {
            const header = [...variables, "_rhs"];
            input.selectAll("*").remove();

            function printEquation(eq, where) {
                let length = 0;

                if (eq.bottom) {
                    where.append("span").attr("class", "tab");
                    where.append("span").attr("id", `eq-${eq.bottom.id}`).attr("class", "text-red").text("⊥");
                }

                let first = true;

                // use header instead of (Object.keys(eq) to ensure same order)
                header.forEach(variable => {
                    if (!eq[variable]) {
                        return; // means it's 0*variable
                    }

                    const term = eq[variable].replace(/\s+/g, '');

                    if (variable === "_rhs") {
                        where.append("span").attr("class", "text-black").text(" = " + term)
                        length += (3 + term.length);
                        return;
                    }

                    if (!showObvious && eval(term) === 0) {
                        return; // don't print, don't set first to false
                    }

                    const plus = first ? "" : " + ";
                    where.append("span").attr("class", "text-black").text(plus)

                    if (!showObvious && eval(term) !== 1) {
                        if (eval(term) === -1) {
                            where.append("span").attr("class", "text-black").text("-");
                            length += 1;
                        } else {
                            where.append("span").attr("class", "text-black").text(term);
                            length += term.length;
                        }
                    }

                    where.append("span").attr("class", "text-green").text(variable);
                    length += (plus.length + variable.length);

                    first = false;

                });

                return length;
            }

            let maxLength = 0;
            Object.values(op.premises).forEach((pr, i) => {
                const where = input
                    .append("span").attr("id", "eq-" + pr.id)
                    .attr("class", "text-eq premise")
                    .on('mouseover', () => {
                        d3.select(`#eq-${pr.id}`).classed("hl-text", true);
                        //Object.keys(hl).forEach(d => hl[d].svg().style.opacity = 0.2);
                        //hl[pr.id].svg().style.stroke = 'red';
                        //hl[pr.id].svg().style.opacity = 1;
                        const el = hl[pr.id];
                        if (el && el.svg()) {
                            el.svg().style.strokeWidth = 5;
                        }
                        
                    })
                    .on('mouseout', () => {
                        d3.select(`#eq-${pr.id}`).classed("hl-text", false);
                        //Object.keys(hl).forEach(d => hl[d].svg().style.opacity = 1);
                        //hl[pr.id].svg().style.stroke = hl[pr.id].color;
                        const el = hl[pr.id];
                        if (el && el.svg()) {
                            el.svg().style.strokeWidth = 1;
                        }
                    })
                const l = printEquation(pr.constraint, where);
                if (l > maxLength) {
                    maxLength = l;
                }
                input.append("br");
            });

            const hr = utils.addMidRule([maxLength], input, `${plot}-mid-rule`);
            const where = input
                .append("span").attr("id", "eq-" + op.conclusion.id)
                .attr("class", "text-eq conclusion")
                .on('mouseover', () => {
                    if (!op.conclusion.constraint.bottom) {
                        d3.select(`#eq-${op.conclusion.id}`).classed("hl-text", true);
                        //Object.keys(hl).forEach(d => hl[d].svg().style.opacity = 0.2);
                        //hl[op.conclusion.id].svg().style.stroke = 'red';
                        //hl[op.conclusion.id].svg().style.opacity = 1;
                        const el = hl[op.conclusion.id];
                        if (el && el.svg()) {
                            el.svg().style.strokeWidth = 5;
                        }
                    }
                })
                .on('mouseout', () => { 
                    if (!op.conclusion.constraint.bottom) {
                        d3.select(`#eq-${op.conclusion.id}`).classed("hl-text", false);
                        //Object.keys(hl).forEach(d => hl[d].svg().style.opacity = 1);
                        //hl[op.conclusion.id].svg().style.stroke = hl[op.conclusion.id].color;
                        const el = hl[op.conclusion.id];
                        if (el && el.svg()) {
                            el.svg().style.strokeWidth = 1;
                        }
                    }
                });
                
            const l = printEquation(op.conclusion.constraint, where);
            if (l > maxLength) {
                hr.attr('width', utils.getRuleLength([l]));
            }
        }

        function displaySolution(plot, values) {
            output.selectAll("*").remove();

            function printValue(value, name, where) {
                if (value) {
                    where.append("span").text(`${name} = ${value}`);
                    return name.length + ("" + value).length;
                } else {
                    where.append("span").text(`${name} = 0`);
                }
            }

            let maxLength = 0;
            vars.forEach((v, i) => {
                const l = printValue(values[i], v, output.append("span").attr("id", `sol-${v}`).attr("class", "text-eq premise"));
                if (l > maxLength) {
                    maxLength = l;
                }
                output.append("br");
            });
        }

        function displayEvaluatedEquations(plot, struct) {
            struct.premises.forEach((v, i) => {
                output.append("span").attr("id", `evEq-${i}`).attr("class", "text-eq premise")
                output.append("br");
            });
        }

        function highlightText(e) {
            d3.selectAll(".text-eq").classed("hl-text", false);
            d3.selectAll(`#eq-${Array.from(e.detail.ids).join(', #eq-')}`).classed("hl-text", true)
        }

        utils.addTitle("Equations Plot");

        const { input, output } = createVisContainer(params, where);
        vars = getVariables(data.ops[data.current]).sort();
        const showObvious = this.showObvious;

        if (data.ops[data.current]) {
            controls({ data, }, where, params);
            displayEquationSystem(data.ops[data.current], vars);

            struct = structuredClone(data.ops[data.current]);
            hl = {};
            solObj = solve(struct);
            this.createPlotControls(solObj);
            if (solObj.type !== 'no solution') {
                displaySolution(plot, solObj.solutions);
            } else {
                displayEvaluatedEquations(plot, struct)
            }
            vis(plot, solObj);

            document.removeEventListener('cd-l-hl', highlightText);
            document.addEventListener('cd-l-hl', highlightText);
        }

        utils.showMeasure(params.subProof.name);
    }
}