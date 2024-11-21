import { controls, createVisContainer } from "../cd-rules.js";
import { utils } from "../../rules.js";

function f(number) {
    return Fraction(number).toFraction();
}

const tip = {
    xLine: true,
    yLine: true,
    renderer: (_, __, i) => { }
};

const premiseColor = '#80cbc4';
const conclusionColor = '#b89aef';
const plot = 'cd-linear-plot';
let struct = {};
let vars = [];
let frees = [];

function solve(data) {
    function solveEquations(systemInput, singleInput) {
        function extractSolutions(matrix, tolerance, solutionType) {
            if (solutionType === 'unique solution') {
                let solutions = [];
                const numRows = matrix.length;
                const numCols = matrix[0].length;

                // Solve for unique solutions
                for (let i = numRows - 1; i >= 0; i--) {
                    let sum = 0;
                    for (let j = i + 1; j < numCols - 1; j++) {
                        sum = Fraction(sum).add(Fraction(matrix[i][j]).mul(Fraction(solutions[j])));
                    }
                    solutions[i] = Fraction(matrix[i][numCols - 1]).sub(Fraction(sum)).div(Fraction(matrix[i][i]));

                    if (Fraction(solutions[i]).abs().lt(tolerance)) {
                        solutions[i] = Fraction(0);
                    }
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
                            equation.push({ c: f(row[j]), v: vars[j] });
                        }
                    }
                    if (equation.length > 0) {
                        equation.push({ c: f(row[numCols]) });
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
                    if (Fraction(row[j]).abs().gt(0)) {
                        free--;
                        nonZeroFound = true;
                        break;
                    }
                }
                if (!nonZeroFound && Fraction(row[numCols]).abs().gt(0)) {
                    hasSolution = false; // No solution if a row has all zeros and a non-zero constant
                }
            });

            if (!hasSolution) {
                return { type: 'no solution', state: matrix, free: matrix[0].length - 1 };
            }
            if (free > 0) {
                return { type: 'infinite solutions', state: matrix, free };
            }
            return { type: 'unique solution', state: matrix, free: 0 };
        }

        try {
            const tolerance = 0;
            const augMatrix = structuredClone(systemInput).concat([singleInput[0]]);
            let system = structuredClone(systemInput); // the system that will be reduced, without the conclusion
            let numRows = system.length;
            let numCols = system[0].length;

            //system.forEach(row => console.log(row.map(c => Fraction(c).toFraction()).join("  ")));

            for (let i = 0; i < numRows; i++) {
                let maxRow = i;
                for (let k = i + 1; k < numRows; k++) {
                    if (Fraction(system[k][i]).abs().gt(system[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [system[i], system[maxRow]] = [system[maxRow], system[i]];

                for (let k = i + 1; k < numRows; k++) {
                    let c = Fraction(-1).mul(system[k][i]).div(system[i][i]);
                    for (let j = i; j < numCols; j++) {
                        system[k][j] = Fraction(system[k][j]).add(c.mul(system[i][j]));
                        if (Fraction(system[k][j]).abs().lt(tolerance)) {
                            system[k][j] = Fraction(0);
                        }
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
        } catch (error) {
            console.error('Error processing equations:', error);
            return { error: error.message };
        }
    }
    const systemData = [];
    const singleData = [];
    const header = [...vars, "_rhs"];

    data.premises.forEach(p => {
        const eq = [];
        header.forEach(h => {
            // must compare directly to undefined
            if (p.constraint[h] !== undefined) {
                eq.push(Fraction(p.constraint[h]));
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
                eq.push(Fraction(data.conclusion.constraint[h]));
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

    vis.innerHTML = `
        <div id=${plot}> </div>

        <div id="${plot}-noSolutionPreviewContainer" style="display: none;">
            <div style="text-align:center"> 
            <h2>The System Has No Solution</h2>
            <span>Augmented Matrix:</span>
            <div id="${plot}-initialStatePreview" class="preview"></div>
            <span>Echelon Form:</span>
            <div id="${plot}-finalStatePreview" class="preview"></div>
            </div>
        </div>`;

    switch (solution.type) {
        case 'unique solution':
            return visualizeUniqueSolution(plot, solution);
        case 'infinite solutions':
            return visualizeInfiniteSolutions(plot, solution);
        case 'no solution':
            return visualizeNoSolutions(plot, solution);
    }
}

function visualizeUniqueSolution(plot, _data) {
    const matrix = _data.matrix;
    const solutions = _data.solutions;

    if (!vars || vars.length === 0) {
        console.error('Variable names are undefined or empty');
        return; // Stop execution if varNames is not defined
    }

    const highlighter = {};
    const select1 = document.getElementById(`var1`).value;
    const select2 = document.getElementById(`var2`).value;

    // set dependent and independent variables
    const index1 = vars.indexOf(select1);
    const index2 = vars.indexOf(select2);
    const independentIndex = index1;
    const dependentIndex = index2;
    const annotations = [
        { x: solutions[independentIndex], text: `${select1} = ${Fraction(solutions[independentIndex]).toFraction()}` },
        { y: solutions[dependentIndex], text: `${select2} = ${Fraction(solutions[dependentIndex]).toFraction()}` }
    ];

    const data = [];

    matrix.forEach((row, i) => {
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
        const fn = `(${Fraction(row[row.length - 1]).sub(Fraction(constantTerm))} - (${Fraction(independentTerm)})x) / (${Fraction(dependentCoefficient)})`;
        const color = i !== matrix.length - 1 ? premiseColor : conclusionColor;
        if (Fraction(dependentCoefficient).equals(0)) { // can't be expressed as f(x), must use annotation
            if (!Fraction(independentTerm).equals(0)) {
                const v = Fraction(row[row.length - 1]).sub(Fraction(constantTerm)).div(Fraction(independentTerm));
                // f(v) === f(solutions[independentIndex]), could use either
                annotations.push({ x: eval(f(v)), color });
            } else {
                console.error('neither of the selected variables can be plotted.')
            }
        } else {
            data.push({ fn, color, updateOnMouseMove: false });
        }
    });

    // Make emphazis on the intersection point
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

    // Use function-plot to draw the plot
    const p = functionPlot({
        tip,
        target: `#${plot}`,
        width: 400,
        height: 400,
        xAxis: { label: `${select1}-axis`, domain: [solutions[independentIndex] - 10, solutions[independentIndex] + 10] },
        yAxis: { label: `${select2}-axis`, domain: [solutions[dependentIndex] - 10, solutions[dependentIndex] + 10] },
        grid: false,
        data,
        annotations
    });

    annotations.forEach((a, i) => {
        if (a.color) {
            document.querySelectorAll(`#${plot} .annotations path`)[i].style.stroke = a.color;
        }
    });

    return { plot: p, hl: highlighter };
}

function visualizeInfiniteSolutions(plot, _data) {
    const dependent = vars.slice(0, -(_data.free));
    const independent = {};
    vars.slice(vars.length - _data.free).forEach(varName => {
        const slider = document.getElementById(`slider-${varName}`);
        independent[varName] = parseFloat(slider.value);
        document.getElementById(`sol-${varName}`).innerHTML = `${varName} = ${slider.value}`;
    });

    document.getElementById(plot).innerHTML = '';
    const solutions = _data.solutions;
    const matrix = _data.matrix;
    const dependentValues = {}; // Store computed values for dependent variables
    const highlighter = {};

    // Iterate over solutions in reverse to handle dependencies correctly
    for (let i = solutions.length - 1; i >= 0; i--) {
        const sol = solutions[i];
        const dependentVar = dependent[i];
        let terms = sol.slice(0, -1);
        let constantTerm = Fraction(sol[sol.length - 1].c);
        let equationParts = [];
        let equationPreviewParts = [];
        let dependentCoef;

        terms.forEach(term => {
            const coef = term.c;
            const varName = term.v

            if (varName === dependentVar) {
                dependentCoef = Fraction(coef); // Coefficient of the dependent variable
            } else {
                let value = independent[varName] || 0; // Default to slider or zero
                // If the variable has been solved in this loop, use its calculated value
                if (dependentValues[varName] !== undefined) {
                    value = dependentValues[varName];
                }
                equationParts.push(Fraction(coef).mul(Fraction(value)));
                equationPreviewParts.push(`${coef}${varName}`);
            }
        });

        // Build the function string for preview
        const varName = dependentVar;
        const independentTermsPreview = equationPreviewParts.join(" + ");
        let solved = independentTermsPreview;

        if (equationPreviewParts.length === 1) {
            solved = ` - ${solved}`;
        } else {
            solved = ` - (${solved})`;
        }

        if (constantTerm !== 0) {
            solved = `${f(constantTerm)}${solved}`;
        }

        if (dependentCoef !== 1) {
            solved = `(${solved}) / (${f(dependentCoef)})`;
        }

        // var = const - (rest of eq) / coef
        const solutionPreview = `${varName} = ${solved}`;
        const independentTerms = equationParts.reduce((acc, part) => Fraction(acc).add(Fraction(part)), 0);

        if (!Fraction(dependentCoef).equals(0)) {
            const it = Fraction(independentTerms)
            const s = Fraction(constantTerm).sub(Fraction(it));
            const fn = `${f(Fraction(s).div(f(dependentCoef)))}`;
            document.getElementById(`sol-${varName}`).innerHTML = `${solutionPreview} = ${fn}`;
            dependentValues[dependentVar] = f(fn); // Store the calculated value
        }
    }

    const x = { varName: vars[0], fn: dependentValues[vars[0]] };
    const y = { varName: vars[1], fn: dependentValues[vars[1]] };

    const annotations = [
        { x: eval(f(x.fn)), text: `${x.varName} = ${f(x.fn)}` },
        { y: eval(f(y.fn)), text: `${y.varName} = ${f(y.fn)}` }
    ];

    const data = [];
    let simplified = false; // plot 2D solution + true: all equations, false: only conclusion

    for (let i = 0; i < matrix.length; i++) {
        if (simplified && i !== matrix.length - 1) {
            continue; // only plots 2D solution + conclusion equation
        }

        const row = matrix[i];
        const dependentCoef = row[vars.indexOf(y.varName)];
        const independentCoef = row[vars.indexOf(x.varName)];
        const constantTerm = row[row.length - 1];
        let replacedSum = 0;

        // Construct the equation for the dependent variable (y)
        row.slice(0, -1).forEach((coef, idx) => {
            if (!Fraction(coef).equals(0)) {
                let currentVar = vars[idx];
                let value = undefined;

                if (currentVar !== x.varName && currentVar !== y.varName) { // already in independentCoef and dependentCoef, respectively 
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
        const equation = `(${f(constantTerm)} - (${f(independentCoef)}x + ${f(replacedSum)})) / ${f(dependentCoef)}`;
        const color = i !== matrix.length - 1 ? premiseColor : conclusionColor;

        if (Fraction(dependentCoef).equals(0)) { // can't be expressed as f(x), must use annotation
            if (!Fraction(independentCoef).equals(0)) {
                // solve for x because y is canceled (0f(x)): x = (sum - c)/A 
                const v = Fraction(constantTerm).sub(Fraction(replacedSum)).div(Fraction(independentCoef));
                annotations.push({ x: eval(f(v)), text: `${x.varName} = ${f(v)}`, color });
            } else {
                console.error('both of the selected variables canceled');
            }
        } else {
            data.push({ fn: equation, color, updateOnMouseMove: false });
        }
    }

    // Use function-plot to draw the plot
    const p = functionPlot({
        tip,
        target: `#${plot}`,
        width: 400,
        height: 400,
        xAxis: { label: `${x.varName}-axis`, domain: [eval(f(x.fn)) - 10, eval(f(x.fn)) + 10] }, // center plot on the intersection point
        yAxis: { label: `${y.varName}-axis`, domain: [eval(f(y.fn)) - 10, eval(f(y.fn)) + 10] },
        grid: false,
        data,
        annotations
    });

    annotations.forEach((a, i) => {
        if (a.color) {
            document.querySelectorAll(`#${plot} .annotations path`)[i].style.stroke = a.color;
        }
    });

    return { plot: p, hl: highlighter };
}

function visualizeNoSolutions(plot, data) {
    const initialStatePreview = document.getElementById(`${plot}-initialStatePreview`);
    const finalStatePreview = document.getElementById(`${plot}-finalStatePreview`);
    const noSolutionPreviewContainer = document.getElementById(`${plot}-noSolutionPreviewContainer`);

    // Function to render matrix using KaTeX
    function renderMatrixKaTeX(matrix, container) {
        let matrixString = '\\begin{bmatrix}';
        matrix.forEach((row, idx) => {
            matrixString += row.slice(0, -1).map(coef => f(coef)).join(' & ');
            matrixString += ' & \\vert & ' + f(row[row.length - 1]); // Adds the augmented column
            if (idx < matrix.length - 1) matrixString += ' \\\\ ';
        });
        matrixString += '\\end{bmatrix}';

        // Clear previous content and render new matrix
        container.innerHTML = '';
        katex.render(matrixString, container, { throwOnError: false, displayMode: true });
    }

    // Render initial and final state matrices
    renderMatrixKaTeX(data.matrix.slice(0, data.matrix.length - 1), initialStatePreview);
    renderMatrixKaTeX(data.echelon, finalStatePreview);

    // Show the preview container
    noSolutionPreviewContainer.style.display = 'block';

    return {};
}

export class LinearCD {
    showObvious = false;

    draw(data, params, where) {
        function getVariables(data) {
            const set = new Set(Object.values(data.ops).map(d => {
                const premises = (d.premises.map(p => Object.keys(p.constraint))).flat(1);
                if (!d.conclusion.constraint.bottom) {
                    return [...premises, ...Object.keys(d.conclusion.constraint)];
                }
                return [...premises];
            }).flat(1));

            set.delete("_rhs");
            set.delete("_asserted");
            return Array.from(set);
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
                const l = printEquation(pr.constraint, input.append("span").attr("id", "eq-" + pr.id).attr("class", "text-eq premise"));
                if (l > maxLength) {
                    maxLength = l;
                }
                input.append("br");

            });

            utils.addMidRule([maxLength], input);
            printEquation(op.conclusion.constraint, input.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"));
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

        function highlightText(e) {
            d3.selectAll(".text-eq").classed("hl-text", false);
            d3.selectAll(`#eq-${Array.from(e.detail.ids).join(', #eq-')}`).classed("hl-text", true)
        }

        utils.addTitle("Gaussian Elimination");

        const { input, output } = createVisContainer(params, where);
        vars = getVariables(data).sort();
        const showObvious = this.showObvious;

        if (data.ops[data.current]) {
            controls({ data, }, where, params);
            displayEquationSystem(data.ops[data.current], vars);

            struct = structuredClone(data.ops[data.current]);
            const solutions = solve(struct);

            this.createPlotControls(solutions);
            displaySolution(plot, solutions.solutions);
            vis(plot, solutions);

            document.removeEventListener('cd-l-hl', highlightText);
            document.addEventListener('cd-l-hl', highlightText);
        }
    };

    createPlotControls(data) {
        function generateVariableSelectors(data) {
            if (vars.length > 2) {
                const controls = document.querySelector(`#linear-vis-controls`);
                controls.style.display = 'inline-block';
                const select1 = document.querySelector(`#var1`);
                const select2 = document.querySelector(`#var2`);
                select1.innerHTML = '';
                select2.innerHTML = '';
                vars.forEach(varName => {
                    const opt1 = new Option(varName, varName);
                    const opt2 = new Option(varName, varName);

                    if (opt2.value === vars[1]) {
                        opt1.disabled = true;
                    }
                    if (opt1.value === vars[0]) {
                        opt2.disabled = true;
                    }

                    select1.add(opt1);
                    select2.add(opt2);
                });
                select1.value = vars[0];
                select2.value = vars[1];

                function update(d) {
                    const other = d.target.id === "var1" ? `#var2 option` : `#var1 option`;

                    document.querySelectorAll(other).forEach(opt => {
                        opt.disabled = false;
                        if (opt.value === d.target.value) {
                            opt.disabled = true;
                        }
                    });

                    switch (data.type) {
                        case 'unique solution':
                            return visualizeUniqueSolution(plot, data);
                        case 'infinite solutions':
                            vars = [select1.value, select2.value, ...vars.filter(v => v !== select1.value && v !== select2.value)];
                            const solution = solve(struct);
                            createSliders(solution);
                            return visualizeInfiniteSolutions(plot, solution);
                        case 'no solution':
                            return visualizeNoSolutions(plot, solution);
                    }
                }

                select1.onchange = update;
                select2.onchange = update;
            } else {
                console.log('at least 3 variables needed for controls to be needed')
            }
        }

        function createSliders(data) {
            frees = [];
            const freeVarsContainer = document.getElementById(`slidersContainer`);
            freeVarsContainer.innerHTML = '<div>Free Variables:</div>';
            freeVarsContainer.style.display = 'block';

            const sliders = {};

            vars.slice(vars.length - data.free).forEach((varName, i) => {
                if (sliders[varName] === undefined) {
                    // create select to replace free variable
                    const select = document.createElement('select');
                    select.id = `select-free-${i}`;
                    select.style = "display:block";
                    vars.forEach(vName => select.add(new Option(vName, vName)));
                    select.value = varName;

                    // create slider to specify free variable value
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = '-10';
                    slider.max = '10';
                    slider.value = '0'; // Default value
                    slider.step = '0.1';
                    slider.id = `slider-${varName}`;

                    const label = document.createElement('label');
                    label.id = `label-${varName}`;
                    label.htmlFor = slider.id;
                    label.style = "display:block;float:right;"
                    label.textContent = `${varName}: 0`;

                    const sliderContainer = document.createElement('div');
                    sliderContainer.style = "display: inline-block";
                    sliderContainer.appendChild(label);
                    sliderContainer.appendChild(slider);

                    // add to controls 
                    const varContainer = document.createElement('div');
                    varContainer.style = "display: inline-flex";
                    varContainer.appendChild(select);
                    varContainer.appendChild(sliderContainer);
                    freeVarsContainer.appendChild(varContainer);

                    // interaction 
                    select.onchange = (d) => {
                        const select1 = document.getElementById(`var1`);
                        const select2 = document.getElementById(`var2`);
                        const idx = +d.target.id.split('select-free-')[1];
                        const previous = frees[idx]

                        let replaced = '';
                        if (d.target.value === select1.value) {
                            select1.value = previous;
                            replaced = 'var1'
                        }

                        if (d.target.value === select2.value) {
                            select2.value = previous;
                            replaced = 'var2'
                        }

                        if (replaced !== '') {
                            const other = replaced === "var1" ? `#var2 option` : `#var1 option`;
                            document.querySelectorAll(other).forEach(opt => {
                                opt.disabled = false;
                                if (opt.value === document.getElementById(replaced).value) {
                                    opt.disabled = true;
                                }
                            });
    
                        }

                        for (let i = 0; i < frees.length; i++) {
                            if (frees[i] === d.target.value && i !== idx) {
                                frees[i] == previous;
                            }
                        }

                        frees[idx] = d.target.value;
                        const deps = [];
                        vars.forEach(v => {
                            if (v !== select1.value && v !== select2.value && !frees.includes(v)) {
                                deps.push(v)
                            }
                        })
                        vars = [select1.value, select2.value, ...deps, ...frees];
                        console.log(vars)
                        const solution = solve(struct);
                        createSliders(solution);
                        return visualizeInfiniteSolutions(plot, solution);
                    }

                    slider.oninput = () => {
                        sliders[varName] = parseFloat(slider.value);
                        label.textContent = `${varName}: ${slider.value}`;
                        document.getElementById(`sol-${varName}`).innerHTML = `${varName} = ${slider.value}`;
                        visualizeInfiniteSolutions(plot, data)
                    };

                    sliders[varName] = parseFloat(slider.value);
                    frees.push(varName);
                }
            });

            return sliders;
        }

        const container = document.getElementById('explanation-container');
        container.style.minHeight = '400px';
        container.style.height = `${118 + data.free ? data.free * 59 : 0}px`;
        container.style.marginTop = "15px"
        container.style.display = 'flex';
        container.innerHTML = '';

        const ctrls = document.createElement('div');
        container.appendChild(ctrls);
        ctrls.innerHTML =
            `<div id="linear-vis-controls" style="display: none;margin-left:25px;margin-right:25px;">
                <div> Plot Axes: </div>
                <label id="l-var1" for="var1">&nbsp;X-axis:</label>
                <select id="var1" class="browser-default"></select>
                <label id="l-var2" for="var2">&nbsp;Y-axis:</label>
                <select id="var2" class="browser-default"></select>
                &nbsp;
                <div id="slidersContainer" style="display: none;"> </div>
            </div>`;

        generateVariableSelectors(data);

        switch (data.type) {
            case 'unique solution':
                break;
            case 'infinite solutions':
                const sliders = createSliders(data);
                break;
            case 'no solution':
                console.log(data.free);
                break;
        }
    }
}