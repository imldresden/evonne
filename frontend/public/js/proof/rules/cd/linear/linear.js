import { controls, createVisContainer } from "../cd-rules.js";
import { utils } from "../../rules.js";

function f(number) {
    return Fraction(number).toFraction();
}

const tip = {
    xLine: true, 
    yLine: true, 
    renderer: (_, __, i) => {}
};

const premiseColor = '#80cbc4';
const conclusionColor = '#b89aef';

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

        function displaySolution(plot, values, variables) {
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
            variables.forEach((v, i) => {
                const l = printValue(values[i], v, output.append("span").attr("id", `${plot}-sol-${v}`).attr("class", "text-eq premise"));
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
        const variables = getVariables(data).sort();
        const showObvious = this.showObvious;

        if (data.ops[data.current]) {
            controls({ data, }, where, params);
            displayEquationSystem(data.ops[data.current], variables);

            const container = document.getElementById('explanation-container');

            container.style.minHeight = '475px';
            container.style.display = 'flex';
            container.innerHTML = '';

            const solutions = this.solve(data.ops[data.current], variables);
            console.log(solutions.solutions)

            const plots = { 'cd-linear-plot': undefined };
            Object.keys(plots).forEach(plot => {
                displaySolution(plot, solutions.solutions, variables);
                plots[plot] = this.vis(plot, solutions, variables);
            });

            console.log(plots)

            document.removeEventListener('cd-l-hl', highlightText);
            document.addEventListener('cd-l-hl', highlightText);
        }
    };

    solve(data, variables) {

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
                                equation.push({ c: f(row[j]), v: variables[j] });
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
                let freeVariables = numCols;
                let hasSolution = true;

                matrix.forEach((row) => {
                    let nonZeroFound = false;
                    for (let j = 0; j < numCols; j++) {
                        if (Fraction(row[j]).abs().gt(0)) {
                            freeVariables--;
                            nonZeroFound = true;
                            break;
                        }
                    }
                    if (!nonZeroFound && Fraction(row[numCols]).abs().gt(0)) {
                        hasSolution = false; // No solution if a row has all zeros and a non-zero constant
                    }
                });

                if (!hasSolution) {
                    return { type: 'no solution', state: matrix };
                }
                if (freeVariables > 0) {
                    return { type: 'infinite solutions', state: matrix, freeVariables };
                }
                return { type: 'unique solution', state: matrix };
            }

            try {
                const tolerance = 0;
                const augMatrix = structuredClone(systemInput).concat([singleInput[0]]);
                let system = structuredClone(systemInput); // the system that will be reduced, without the conclusion
                let numRows = system.length;
                let numCols = system[0].length;

                for (let i = 0; i < numRows; i++) {
                    let maxRow = i;
                    for (let k = i + 1; k < numRows; k++) {
                        if (Math.abs(system[k][i]) > Math.abs(system[maxRow][i])) {
                            maxRow = k;
                        }
                    }
                    [system[i], system[maxRow]] = [system[maxRow], system[i]];

                    for (let k = i + 1; k < numRows; k++) {
                        let c = Fraction(-1).mul(system[k][i]).div(system[i][i]);
                        for (let j = i; j < numCols; j++) {
                            system[k][j] = Fraction(system[k][j]).add(c.mul(system[i][j]));
                            if (Math.abs(system[k][j]) < tolerance) {
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
                    free: analysis.freeVariables // free variable count for 'infinite solutions'
                };
            } catch (error) {
                console.error('Error processing equations:', error);
                return { error: error.message };
            }
        }

        const systemData = [];
        const singleData = [];
        const header = [...variables, "_rhs"];

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

    vis(plot, solution, variables) {
        const container = document.getElementById('explanation-container')
        const vis = document.createElement('div');
        container.appendChild(vis);

        vis.innerHTML = `
            <div style="margin:5px"> 
                <div id="${plot}-linear-vis-controls" style="display: none;">
                    <div style="display: inline-block;">
                    <label id="${plot}-l-var1" for="${plot}-var1">&nbsp;X-axis:</label>
                    <select id="${plot}-var1" class="browser-default"></select>
                    </div>    
                    <div style="display: inline-block;">
                    <label id="${plot}-l-var2" for="${plot}-var2">&nbsp;Y-axis:</label>
                    <select id="${plot}-var2" class="browser-default"></select>
                    </div>
                </div>

                <div id="${plot}-slidersContainer" style="display: none;"> </div>

                <div id=${plot}> </div>
            </div>

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
                return visualizeUniqueSolution(solution, variables);
            case 'infinite solutions':
                return visualizeInfiniteSolutions(solution, variables);
            case 'no solution':
                return visualizeNoSolutions(solution, variables);
        }

        function visualizeUniqueSolution(data, vars) {
            generateVariableSelectors(data, vars);
            return updateUnique(data, vars);
        }

        function generateVariableSelectors(data, vars) {
            if (vars.length > 2) {
                const controls = document.querySelector(`#${plot}-linear-vis-controls`);
                controls.style.display = 'inline-block';
                const select1 = document.querySelector(`#${plot}-var1`);
                const select2 = document.querySelector(`#${plot}-var2`);
                select1.innerHTML = '';
                select2.innerHTML = '';
                vars.forEach(varName => {
                    select1.add(new Option(varName, varName));
                    select2.add(new Option(varName, varName));
                });
                select1.value = vars[0];
                select2.value = vars[1];

                function update(d) {
                    const other = d.target.id === `#${plot}-var1` ? `#${plot}-var2 option` : `#${plot}-var1 option`;
                    document.querySelectorAll(other).forEach(opt => {
                        if (opt.value == d.target.value) {
                            opt.disabled = true;
                        } else {
                            opt.disabled = false;
                        }
                    });
                    updateUnique(data, vars);
                }

                update({ target: select1 });
                update({ target: select2 });

                select1.addEventListener('change', update);
                select2.addEventListener('change', update);
            } else {
                console.logs('at least 3 variables needed for controls to be needed')
            }
        }

        function updateUnique(_data, vars) {
            const matrix = _data.matrix;
            const solutions = _data.solutions;

            if (!vars || vars.length === 0) {
                console.error('Variable names are undefined or empty');
                return; // Stop execution if varNames is not defined
            }

            const highlighter = {};
            const select1 = document.getElementById(`${plot}-var1`).value;
            const select2 = document.getElementById(`${plot}-var2`).value;

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
                const color = i !== matrix.length-1 ? premiseColor : conclusionColor;
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

        function visualizeInfiniteSolutions(data, vars) {
            const slidersContainer = document.getElementById(`${plot}-slidersContainer`);
            slidersContainer.innerHTML = '';
            slidersContainer.style.display = 'block';

            const dependent = vars.slice(0, -(data.free));
            const independent = {};

            vars.slice(vars.length-data.free).forEach(varName => {
                if (varName && !dependent.includes(varName)) { // Check if varName is not a dependent variable
                    if (independent[varName] === undefined) { // Create a slider if it hasn't been created yet
                        const slider = document.createElement('input');
                        slider.type = 'range';
                        slider.min = '-10';
                        slider.max = '10';
                        slider.value = '0'; // Default value
                        slider.step = '0.1';
                        slider.id = `slider-${varName}`;

                        const label = document.createElement('label');
                        label.id = `${plot}-label-${varName}`;
                        label.htmlFor = slider.id;
                        label.style = "display:block"
                        label.textContent = `${varName}: 0`;

                        // Update display as slider value changes
                        slider.oninput = () => {
                            independent[varName] = parseFloat(slider.value);
                            updateInfinite(data, dependent, independent, vars);
                            label.textContent = `${varName}: ${slider.value}`;
                            document.getElementById(`${plot}-sol-${varName}`).innerHTML = `${varName} = ${slider.value}`;
                        };

                        const sliderContainer = document.createElement('div');
                        sliderContainer.style = "display: inline-block";
                        sliderContainer.appendChild(label);
                        sliderContainer.appendChild(slider);
                        slidersContainer.appendChild(sliderContainer);

                        // Initialize slider value in the map
                        independent[varName] = parseFloat(slider.value);
                    }
                }
            });

            // Initial plot with default values
            return updateInfinite(data, dependent, independent, vars);
        }

        function updateInfinite(_data, dependent, independent, vars) {
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
                let constantTerm = Fraction(sol[sol.length-1].c);
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
                    document.getElementById(`${plot}-sol-${varName}`).innerHTML = `${solutionPreview} = ${fn}`;
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

                        if (currentVar !== x.varName && currentVar !== y.varName) { // already in incognitaCoef and dependentCoef, respectively 
                            if (independent[currentVar] !== undefined || dependentValues[currentVar]) {
                                value = independent[currentVar] !== undefined ? independent[currentVar] : dependentValues[currentVar];
                                replacedSum = Fraction(replacedSum).add(Fraction(coef).mul(Fraction(value)));
                            } else {
                                console.error('this can\'t happen -- variables should be in either the sliders or dependentValues map')
                            }
                        }
                    }
                });

                // Build the function string for ploter: f(x) = c - (Ax + sum) / B 
                const equation = `(${f(constantTerm)} - (${f(independentCoef)}x + ${f(replacedSum)})) / ${f(dependentCoef)}`;
                const color = i !== matrix.length-1 ? premiseColor : conclusionColor;
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

        function visualizeNoSolutions(data, vars) {
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
    }
}