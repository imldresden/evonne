import { controls, createVisContainer } from "../cd-rules.js";
import { utils } from "../../rules.js";

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

            utils.addMidRule([maxLength], input)
            printEquation(op.conclusion.constraint, input.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"))
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

            utils.addMidRule([maxLength], input)
            printEquation(op.conclusion.constraint, input.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"))
        }

        function displaySolution(values, variables) {
            output.selectAll("*").remove();

            function printValue(value, name, where) {
                if (value) {
                    where.append("span").attr("class", "text-red").text(`${name} = ${value}`);
                    return name.length + ("" + value).length;
                } else {
                    where.append("span").attr("class", "text-red").text(`${name} ∈ ℝ`);
                }
            }

            let maxLength = 0;
            variables.forEach((v, i) => {
                const l = printValue(values[i], v, output.append("span").attr("id", "sol-" + v).attr("class", "text-eq premise"));
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

        utils.addTitle("Numerical Logic: Gaussian Elimination");

        const { input, output } = createVisContainer(params, where);
        const variables = getVariables(data);
        const showObvious = this.showObvious; 
        

        if (data.ops[data.current]) {
            controls({ data, }, where, params);
            displayEquationSystem(data.ops[data.current], variables);

            const solutions = this.solve(data.ops[data.current], variables);

            if (solutions.type === 'unique solution') {
                function strip(number) {
                    return parseFloat(number).toPrecision(12)/1;
                }
    
                solutions.solutions = solutions.solutions.map(strip);
            }

            displaySolution(solutions.solutions, variables);
            this.vis(solutions, variables);
            
            document.removeEventListener('cd-l-hl', highlightText)
            document.addEventListener('cd-l-hl', highlightText)
        }
    };

    solve(data, variables) {
        
        function solveEquations(systemInput, singleInput) {

            function extractSolutions(matrix, tolerance, solutionType) {
                if (solutionType !== 'infinite solutions') {
                    let solutions = [];
                    const numRows = matrix.length;
                    const numCols = matrix[0].length;
        
                    // Solve for unique solutions
                    for (let i = numRows - 1; i >= 0; i--) {
                        let sum = 0;
                        for (let j = i + 1; j < numCols - 1; j++) {
                            sum += matrix[i][j] * (solutions[j] || 0);
                        }
                        solutions[i] = (matrix[i][numCols - 1] - sum) / matrix[i][i];
        
                        if (Math.abs(solutions[i]) < tolerance) {
                            solutions[i] = 0;
                        }
                    }
                    return solutions;
                } else {
                    // Handle infinite solutions
                    const numRows = matrix.length;
                    const numCols = matrix[0].length - 1; // excluding the constant column
                    let solutionFunctions = [];
        
                    matrix.forEach((row, rowIndex) => {
                        let equationParts = [];
                        for (let j = 0; j < numCols; j++) {
                            if (Math.abs(row[j]) > tolerance) {
                                equationParts.push(`${row[j].toFixed(2)}x${j+1}`);
                            }
                        }
                        if (equationParts.length > 0) {
                            // Join all parts and append the equals sign with the last constant value
                            let equation = equationParts.join(' + ') + ` = ${row[numCols].toFixed(2)}`;
                            solutionFunctions.push(equation);
                        }
                    });
        
                    return solutionFunctions;
                }
            }
        
            function analyzeSolutions(matrix) {
                const numCols = matrix[0].length - 1; // Exclude the constant column
                let freeVariables = numCols;
                let hasSolution = true;
        
                matrix.forEach((row) => {
                    let nonZeroFound = false;
                    for (let j = 0; j < numCols; j++) {
                        if (Math.abs(row[j]) > 0) {
                            freeVariables--;
                            nonZeroFound = true;
                            break;
                        }
                    }
                    if (!nonZeroFound && Math.abs(row[numCols]) > 0) {
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
                const tolerance = 1e-10;
                let extendedSystem = structuredClone(systemInput); //.concat([singleInput[0]]);
                let originalMatrix = structuredClone(extendedSystem);
                let numRows = extendedSystem.length;
                let numCols = extendedSystem[0].length;
        
                for (let i = 0; i < numRows; i++) {
                    let maxRow = i;
                    for (let k = i + 1; k < numRows; k++) {
                        if (Math.abs(extendedSystem[k][i]) > Math.abs(extendedSystem[maxRow][i])) {
                            maxRow = k;
                        }
                    }
                    [extendedSystem[i], extendedSystem[maxRow]] = [extendedSystem[maxRow], extendedSystem[i]];
        
                    for (let k = i + 1; k < numRows; k++) {
                        let c = -extendedSystem[k][i] / extendedSystem[i][i];
                        for (let j = i; j < numCols; j++) {
                            extendedSystem[k][j] += c * extendedSystem[i][j];
                            if (Math.abs(extendedSystem[k][j]) < tolerance) {
                                extendedSystem[k][j] = 0;
                            }
                        }
                    }
                }
                
                // Use analyzeSolutions to determine the type of solution based on the echelon form of the matrix
                const solutionAnalysis = analyzeSolutions(extendedSystem);
                const solutions = extractSolutions(extendedSystem, tolerance, solutionAnalysis.type);
        
                return {
                    type: solutionAnalysis.type,
                    matrix: originalMatrix,
                    echelon: extendedSystem,
                    solutions: solutions,
                    free: solutionAnalysis.freeVariables // Include free variable count for 'infinite solutions'
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
                    eq.push(+eval(p.constraint[h]));
                } else {
                    eq.push(0);
                }
            });
            systemData.push(structuredClone(eq))
        });

        if (data.conclusion.constraint) {
            const eq = [];
            header.forEach(h => {
                // must compare directly to undefined
                if (data.conclusion.constraint[h] !== undefined) {
                    eq.push(+data.conclusion.constraint[h]);
                } else {
                    eq.push(0);
                }
            });
            singleData.push(structuredClone(eq));
        } else {
            console.error("no conclusion equation");
        }

        return solveEquations(structuredClone(systemData), structuredClone(singleData));
    }

    vis(solution, variables) {
        const plot = '#cd-linear-plot';
        const container = document.getElementById('explanation-container');

        container.style.minHeight = '475px';
        container.innerHTML = `
            <div style="margin:5px"> 
                <div id="linear-vis-controls" style="display: none;">
                    <div style="display: inline-block;">
                    <label id="l-var1" for="var1">&nbsp;X-axis:</label>
                    <select id="var1" class="browser-default"></select>
                    </div>    
                    <div style="display: inline-block;">
                    <label id="l-var2" for="var2">&nbsp;Y-axis:</label>
                    <select id="var2" class="browser-default"></select>
                    </div>
                </div>

                <div id="slidersContainer" style="display: none;"> </div>

                <div id="cd-linear-plot"> </div>
            </div>

            <div id="noSolutionPreviewContainer" style="display: none;">
                <div style="text-align:center"> 
                <h2>The System Has No Solution</h2>
                <span>Augmented Matrix:</span>
                <div id="initialStatePreview" class="preview"></div>
                <span>Echelon Form:</span>
                <div id="finalStatePreview" class="preview"></div>
                </div>
            </div>`;

        switch (solution.type) {
            case 'unique solution':
                visualizeUniqueSolution(solution, variables);
                break;
            case 'infinite solutions':
                visualizeInfiniteSolutions(solution);
                break;
            case 'no solution':
                visualizeNoSolutions(solution);
                break;
        }
        
        function visualizeUniqueSolution(data, vars) {
            generateVariableSelectors(data, vars);
            updateUnique(data.matrix, vars, data.solutions);
        }
        
        function generateVariableSelectors(data, varNames) {
            if (varNames.length > 2) {
                const controls = document.getElementById('linear-vis-controls');
                controls.style.display = 'inline-block'; 
                const select1 = document.getElementById('var1');
                const select2 = document.getElementById('var2');
                select1.innerHTML = '';
                select2.innerHTML = '';
                varNames.forEach(varName => {
                    select1.add(new Option(varName, varName));
                    select2.add(new Option(varName, varName));
                });
                select1.value = varNames[0];
                select2.value = varNames[1];
    
                function update(d) {
                    const other = d.target.id === 'var1' ? "#var2 option" : "#var1 option";
                    //document.getElementById(`l-${d.target.id}`).textContent = `${d.target.value}-axis`;
                    document.querySelectorAll(other).forEach(opt => {
                        if (opt.value == d.target.value) {
                            opt.disabled = true;
                        } else {
                            opt.disabled = false;
                        }
                    });
                    updateUnique(data.matrix, varNames, data.solutions)
                }
    
                update({target: select1});
                update({target: select2});
    
                select1.addEventListener('change', update);
                select2.addEventListener('change', update);
            } else {
                console.logs('at least 3 variables needed for controls to be needed')
            }
        }
        
        function updateUnique(matrix, varNames, solutions) {
            if (!varNames || varNames.length === 0) {
                console.error('Variable names are undefined or empty');
                return; // Stop execution if varNames is not defined
            }
        
            const select1 = document.getElementById('var1').value;
            const select2 = document.getElementById('var2').value;
        
            // Determine which variable is independent (lowest index) and which is dependent (highest index)
            const index1 = varNames.indexOf(select1);
            const index2 = varNames.indexOf(select2);
            const dependentIndex = index1;
            const independentIndex = index2;
            const annotations = [
                { x: solutions[independentIndex], text: `${select1} = ${Number((solutions[independentIndex]).toFixed(2))}` },
                { y: solutions[dependentIndex], text: `${select2} = ${Number((solutions[dependentIndex]).toFixed(2))}` }
            ];

            let data = matrix.map(row => {
                // Replace all other variables with their solutions except for the selected free variables
                let adjustedRow = row.slice(0, -1).map((coef, i) => {
                    if (i !== independentIndex && i !== dependentIndex) {
                        return coef * solutions[i]; // Use the solved value
                    }
                    return coef; // Keep the coefficient for the free variables
                });
        
                // Rearrange the equation to solve for the dependent variable
                const dependentCoefficient = adjustedRow[dependentIndex];
                const independentTerm = adjustedRow.reduce((acc, coef, i) => {
                    return i !== dependentIndex ? acc + coef * (i === independentIndex ? 1 : 0) : acc;
                }, 0);
                const constantTerm = adjustedRow.reduce((acc, coef, i) => {
                    return i !== dependentIndex && i !== independentIndex ? acc + coef : acc;
                }, 0);
        
                // Construct the function string for function-plot
                // Construct the function string for function-plot
                let fn = `(${row[row.length - 1] - constantTerm} - ${independentTerm}x) / ${dependentCoefficient}`;
        
                return {
                    fn: `${fn}`,
                    updateOnMouseMove: true
                };
            });
        
            // Make emphazis on the intersection point
        
            let points = {
                points: [
                    [solutions[independentIndex], solutions[dependentIndex]]
                ],
                fnType: 'points',
                graphType: 'scatter'
            };
            data.push(points);
        
            let textCoordinates = solutions.filter(s => !isNaN(s)).map((solution, solutionIndex) => {
                if (solutionIndex !== independentIndex && solutionIndex !== dependentIndex) {
                    if (solutions[solutionIndex] !== null) {
                        return {
                            graphType: 'text',
                            location: [solutions[independentIndex], solutions[dependentIndex]],
                            text: `Fixed Solutions : ${varNames[solutionIndex]} = ${Number((solutions[solutionIndex]).toFixed(2))}`,
                            color: 'black'
                        }
                    }
                }
        
            });
        
            textCoordinates = textCoordinates.filter(function (element) {
                return element !== undefined;
            });
        
            for (const text of textCoordinates) {
                data.push(text);
            }
        
            // Use function-plot to draw the plot
            functionPlot({
                target: plot,
                width: 400,
                height: 400,
                xAxis: { label: `${select1}-axis`, domain: [solutions[independentIndex] - 1, solutions[independentIndex] + 1] },
                yAxis: { label: `${select2}-axis`, domain: [solutions[dependentIndex] - 1, solutions[dependentIndex] + 1] },
                grid: false,
                data: data,
                annotations: annotations
            });
        }
        
        function visualizeInfiniteSolutions(data) {
            const slidersContainer = document.getElementById('slidersContainer');
            slidersContainer.innerHTML = ''; // Clear previous sliders
            document.getElementById('slidersContainer').style.display = 'block'; // Make the previews container visible
        
            let dependentVars = [];
            let sliders = {};
        
            // First pass to identify dependent variables
            data.solutions.forEach((solution) => {
                const parts = solution.match(/[\+\-]?[\d\.]+x\d+/g); // Extract terms like '1.00x1'
                let lowestIndex = Infinity;
                let lowestVar = '';
        
                parts.forEach(part => {
                    const [_, coef, varName] = part.match(/([\+\-]?\d+\.\d+)(x\d+)/);
                    const varIndex = parseInt(varName.substring(1));
                    if (varIndex < lowestIndex) {
                        lowestIndex = varIndex;
                        lowestVar = varName;
                    }
                });
        
                dependentVars.push(lowestVar);
            });
        
            // Second pass to set up sliders for all independent variables
            data.solutions.forEach((solution) => {
                const parts = solution.match(/[\+\-]?[\d\.]+x\d+/g);
                parts.forEach(part => {
                    const [_, coef, varName] = part.match(/([\+\-]?\d+\.\d+)(x\d+)/);
                    if (!dependentVars.includes(varName)) { // Check if varName is not a dependent variable
                        if (!sliders[varName]) { // Create a slider if it hasn't been created yet
                            const slider = document.createElement('input');
                            slider.type = 'range';
                            slider.min = '-10';
                            slider.max = '10';
                            slider.value = '0'; // Default value
                            slider.step = '0.1';
                            slider.id = `slider-${varName}`;
        
                            const vName = `${variables[(+varName.slice(1))-1]}`;
                            const label = document.createElement('label');
                            label.id = `label-${vName}`;
                            label.htmlFor = slider.id;
                            label.style = "display:block"
                            label.textContent = `${vName}: `;

                            // Update display as slider value changes
                            slider.oninput = () => {
                                sliders[varName] = parseFloat(slider.value);
                                updateInfinite(data.solutions, dependentVars, sliders, data.matrix, variables);
                                label.textContent = `${vName}: ${slider.value}`;
                            };
        
                            const sliderContainer = document.createElement('div');
                            sliderContainer.style = "display: inline-block";
                            sliderContainer.appendChild(label);
                            sliderContainer.appendChild(slider);
                            slidersContainer.appendChild(sliderContainer);
        
                            // Initialize slider value in the map
                            sliders[varName] = parseFloat(slider.value);
                        }
                    }
                });
            });
        
            // Initial plot with default values
            updateInfinite(data.solutions, dependentVars, sliders, data.matrix, variables);
        }
        
        function updateInfinite(solutions, dependentVars, sliders, originalMatrix, variables) {
            const plotContainer = document.querySelector(plot);
            plotContainer.innerHTML = '';
            let annotations = [{ x: "", text: "" }];
            let data = [];
            let solutionsPreview = [];
            let solutionsReplacedPreview = [];
            let singlePreview = [];
            let singleReplacedPreview = [];
            let dependentValues = {}; // Store computed values for dependent variables
        
            // Iterate over solutions in reverse to handle dependencies correctly
            for (let i = solutions.length - 1; i >= 0; i--) {
                const sol = solutions[i];
                const dependentVar = dependentVars[i];
                let terms = sol.split("=")[0].trim().match(/([\+\-]?\d+\.\d+)(x\d+)/g);
                let constantTerm = parseFloat(sol.split("=")[1].trim());
                let equationParts = [];
                let equationPreviewParts = [];
                let dependentCoef;
                terms.forEach(term => {
                    const [match, coef, varName] = term.match(/([\+\-]?\d+\.\d+)(x\d+)/);
        
                    if (varName === dependentVar) {
                        dependentCoef = parseFloat(coef); // Coefficient of the dependent variable
                    } else {
                        let value = sliders[varName] || 0; // Default to slider or zero
                        // If the variable has been solved in this loop, use its calculated value
                        if (dependentValues[varName] !== undefined) {
                            value = dependentValues[varName];
                        }
                        equationParts.push(`(${coef} * ${value})`);
                        equationPreviewParts.push(`(${coef}${variables[(+varName.slice(1))-1]})`);
                    }
                });
        
                // Clear the equation for the dependent variable
                // Build the function string for plotting
                let independentTerms = equationParts.join(" + ");
                let fn = `(${constantTerm}${independentTerms.length > 0 ? `-(${independentTerms})` : ''} ) / ${dependentCoef}`;
        
                // Clear the equation for the dependent variable
                // Build the function string for preview
                let independentTermsPreview = equationPreviewParts.join(" + ");
                let solutionPreview = `${
                    variables[(+dependentVar.slice(1))-1]
                } = (${
                    constantTerm > 0 ? constantTerm : ''}${independentTerms.length > 0 ? `-(${independentTermsPreview})` : ''} ) / ${dependentCoef}`;

                    
                let computedSolution = eval(fn);
                document.getElementById(`sol-${variables[(+dependentVar.slice(1))-1]}`).innerHTML = `${solutionPreview} = ${computedSolution}`;
                dependentValues[dependentVar] = computedSolution; // Store the calculated value
        
                let replacedSolutionPrev = `${dependentVar} = ${fn}`;
                let computedSolutionPrev = `${dependentVar} = ${computedSolution}`;
        
                // Add the function to the plot data
                data.push({ fn });
        
                // Add the function to the preview
                solutionsPreview.push(solutionPreview);
                solutionsReplacedPreview.push(replacedSolutionPrev);
                solutionsReplacedPreview.push(computedSolutionPrev);
            }
        
            let x_value = eval(data.pop()["fn"]);
            annotations[0]["x"] = x_value
            annotations[0]["text"] = `x = ${x_value.toFixed(2)}`
            // Handle the last row from the original matrix
            if (originalMatrix.length) {
                let lastRow = originalMatrix[originalMatrix.length - 1];
                let highestDependentVar = dependentVars.reduce((acc, varName) => {
                    const varIndex = parseInt(varName.substring(1)); // extract number from varName like 'x1'
                    return varIndex > parseInt(acc.substring(1)) ? varName : acc;
                }, dependentVars[0]);
        
                let highestIndex = parseInt(highestDependentVar.substring(1)) - 1;
                let dependentCoef = lastRow[highestIndex];
                let constantTerm = lastRow[lastRow.length - 1];
                let equationParts = [];
                let equationPreviewParts = [];
        
                // Construct the equation for the dependent variable with the highest index
                lastRow.slice(0, -1).forEach((coef, idx) => {
                    let currentVar = `x${idx + 1}`;
                    let value = undefined;
                    if (idx !== highestIndex) {
                        if (sliders[currentVar] !== undefined) { 
                            value = sliders[currentVar]; 
                        } else { 
                            value = "x"; 
                        }; // Get the slider value or default to x
                        equationParts.push(`(${coef} * ${value})`); // Add all non-dependent terms
                        equationPreviewParts.push(`(${coef} * ${currentVar})`);
                    }
                });
        
                // Sum the terms, taking into account the signs
                let nonDependentTerms = equationParts.join(" + ");
                // Build the function string for preview
                let independentTermsPreview = equationPreviewParts.join(" + ");
                let solutionPreview = `${highestDependentVar} = (${constantTerm}${nonDependentTerms.length > 0 ? ` - (${independentTermsPreview})` : ''} ) / ${dependentCoef}`;
                // Format the final equation: isolate the dependent variable
                let equation = `(${constantTerm} ${nonDependentTerms.length > 0 ? ` - (${nonDependentTerms})` : ''} )/ ${dependentCoef}`;
                let replacedSolutionPrev = `${highestDependentVar} = ${equation}`;
                data.push({
                    fn: equation,
                    updateOnMouseMove: true
                });
        
                singlePreview.push(solutionPreview);
                singleReplacedPreview.push(replacedSolutionPrev);
        
            }
        
            // Use function-plot to draw the plot
            functionPlot({
                target: plot,
                width: 400,
                height: 400,
                xAxis: { label: 'X-axis', domain: [-10, 10] },
                yAxis: { label: 'Y-axis', domain: [-10, 10] },
                grid: false,
                data: data,
                annotations: annotations
            });
        }
        
        function visualizeNoSolutions(data) {
            const initialStatePreview = document.getElementById('initialStatePreview');
            const finalStatePreview = document.getElementById('finalStatePreview');
            const noSolutionPreviewContainer = document.getElementById('noSolutionPreviewContainer');
        
            // Function to render matrix using KaTeX
            function renderMatrixKaTeX(_matrix, container) {
                const matrix = _matrix.slice(0, _matrix.length-1);
                let matrixString = '\\begin{bmatrix}';
                matrix.forEach((row, idx) => {
                    matrixString += row.slice(0, -1).map(coef => coef.toString()).join(' & ');
                    matrixString += ' & \\vert & ' + row[row.length - 1]; // Adds the augmented column
                    if (idx < matrix.length - 1) matrixString += ' \\\\ ';
                });
                matrixString += '\\end{bmatrix}';
        
                // Clear previous content and render new matrix
                container.innerHTML = '';
                katex.render(matrixString, container, { throwOnError: false, displayMode: true });
            }
        
            // Render initial and final state matrices
            renderMatrixKaTeX(data.matrix, initialStatePreview);
            renderMatrixKaTeX(data.echelon, finalStatePreview);
        
            // Show the preview container
            noSolutionPreviewContainer.style.display = 'block';
        }
    }
}