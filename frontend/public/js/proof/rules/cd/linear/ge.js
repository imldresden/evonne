let originalMatrix, currentSolutions, echelonMatrix, currentMatrixType, currentVarNames;
let plot = '#plot';

document.getElementById('updatePlotButton').addEventListener('click', function () {
    if (!currentSolutions || currentSolutions.length === 0) {
        console.error('Variable names are undefined or empty');
        return; // Stop execution if data is not defined or not loaded
    }
    switch (currentMatrixType) {
        case 'unique solution':
            updateUnique(originalMatrix, currentVarNames, currentSolutions);
            break;
        case 'infinite solutions':
            break;
        case 'no solution':
            break;
    }
});

document.getElementById('exampleUnique').addEventListener('click', function () {
    resetForm()

    const systemData = [
        [3, 4, 0, 22], // 3x1 + 4x2 = 22
        [1, 1, 1, 10], // x1 + x2 + x3 = 10
        [0, -2, 1, 12] // -2x2 + x3 = 12
    ]
    
    const singleData = [
        [0, 3, 1, -16] // 3x2 + x3 = -16
    ];

    const results = solveEquations(systemData, singleData);
    visualize(results); 
});

document.getElementById('exampleInfinite').addEventListener('click', function () {
    resetForm()
    const systemData = [
        [1, 1, 1, 0, 0, 0, 0], // x1 + x2 + x3 = 0
        [0, 0, 0, 1, 1, 1, 0] // x4 + x5 + x6 = 0
    ];
    
    const singleData = [
        [1, 1, 1, 1, 1, 1, 0] // x1 + x2 + x3 + x4 + x5 + x6 = 0
    ];

    const results = solveEquations(systemData, singleData);
    visualize(results); 
});

document.getElementById('exampleNoSolution').addEventListener('click', function () {
    resetForm()
    const systemData = [
        [1, -1, 0, -1], // x1 - x2 = -1
        [1, 0, -1, -2]  // x1 - x3 = -2
    ];

    const singleData = [
        [0, 1, -1, 0]  // x2 - x3 = 0
    ];

    const results = solveEquations(systemData, singleData);
    visualize(results); 
});

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
                        equationParts.push(`${row[j].toFixed(2)}x${j + 1}`);
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
        let extendedSystem = systemInput.concat([singleInput[0]]);
        let originalMatrix = JSON.parse(JSON.stringify(extendedSystem));
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
        let solutions = [];
        solutions = extractSolutions(extendedSystem, tolerance, solutionAnalysis.type);


        return {
            type: solutionAnalysis.type,
            original_state: originalMatrix,
            echelon_state: extendedSystem,
            solutions: solutions,
            freeVariables: solutionAnalysis.freeVariables // Include free variable count for 'infinite solutions'
        };
    } catch (error) {
        console.error('Error processing equations:', error);
        return { error: error.message };
    }
}

function visualize(data) {
    let originalState = data.original_state;
    let echelonForm = data.echelon_state;
    let solutions = data.solutions;
    let solutionType = data.type;

    function loadDataForPlot(_originalState, _echelonMatrix, _solutions, _matrixType, _varNames = undefined) {
        originalMatrix = _originalState;
        echelonMatrix = _echelonMatrix;
        currentSolutions = _solutions;
        currentMatrixType = _matrixType;
        currentVarNames = _varNames;
    }

    switch (solutionType) {
        case 'unique solution':
            let varNames = Array(originalState[0].length - 1).fill(0).map((_, i) => `x${i + 1}`);
            loadDataForPlot(originalState, echelonForm, solutions, solutionType, varNames)
            visualizeUniqueSolution(originalState, solutions, varNames);
            break;
        case 'infinite solutions':
            loadDataForPlot(originalState, echelonForm, solutions, solutionType)
            visualizeInfiniteSolutions(originalState, solutions);

            break;
        case 'no solution':
            visualizeNoSolutions(originalState, echelonForm);
            break;
    }
}

function visualizeUniqueSolution(matrix, solutions, varNames) {
    generateVariableSelectors(varNames);
    updateUnique(matrix, varNames, solutions);
}

function generateVariableSelectors(varNames) {
    document.getElementById('linear-vis-controls').style.display = 'block'; // Make the previews container visible
    const select1 = document.getElementById('var1');
    const select2 = document.getElementById('var2');
    select1.innerHTML = '';
    select2.innerHTML = '';
    varNames.forEach(varName => {
        select1.add(new Option(varName, varName));
        select2.add(new Option(varName, varName));
    });
    select1.value = varNames[0];
    select2.value = varNames[1] || varNames[0];
}

function updateUnique(matrix, varNames, solutions) {

    function formatSystemWithSolutions(matrix, varNames, solutions, dependentIndex, independentIndex) {
        let solutionText = '';
        solutionText += varNames.map((varName, index) => {
            return `${varName} = ${solutions[index] !== null ? solutions[index].toFixed(1) : 'undefined'}`;
        }).join(', ');

        const equations = [];
        matrix.forEach((row) => {
            let equation = row.slice(0, -1).map((coef, index) => {
                if (index !== independentIndex && index !== dependentIndex && solutions[index] !== null) {
                    return `${coef}(${solutions[index].toFixed(1)})`;
                } else {
                    return `${coef}${varNames[index]}`;
                }
            }).join(' + ') + ` = ${row[row.length - 1]}`;
            equations.push(equation);
        });

        return { solutionText, equations };
    }

    function displayFormattedPreview(formatted) {
        const previewContainer = document.getElementById('previewContainer');
        previewContainer.innerHTML = '';

        const solutionPreview = document.createElement('div');
        const solutionTitle = document.createElement('h3') 
        solutionTitle.innerHTML = "Solution: ";
        
        // Display solutions
        katex.render(formatted.solutionText, solutionPreview, {
            throwOnError: false,
            displayMode: true
        });

        previewContainer.appendChild(solutionTitle);
        previewContainer.appendChild(solutionPreview);

        const systemPreview = document.createElement('div');
        const systemTitle = document.createElement('h3') 
        systemTitle.innerHTML = "System of Equations: ";

        // Display system of equations
        formatted.equations.forEach(eq => {
            const eqDiv = document.createElement('div');
            katex.render(eq, eqDiv, {
                throwOnError: false,
                displayMode: true
            });
            systemPreview.appendChild(eqDiv);
        });

        previewContainer.appendChild(systemTitle);
        previewContainer.appendChild(systemPreview);
    }

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
    const annotations = [{ x: solutions[independentIndex], text: `x = ${Number((solutions[independentIndex]).toFixed(2))}` },
    { y: solutions[dependentIndex], text: `y = ${Number((solutions[dependentIndex]).toFixed(2))}` }];

    // Format the system and solutions for display
    const formatted = formatSystemWithSolutions(matrix, varNames, solutions, dependentIndex, independentIndex);

    // Display solutions and equations using KaTeX
    displayFormattedPreview(formatted)

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
        width: 800,
        height: 600,
        xAxis: { label: 'X-axis', domain: [solutions[independentIndex] - 1, solutions[independentIndex] + 1] },
        yAxis: { label: 'Y-axis', domain: [solutions[dependentIndex] - 1, solutions[dependentIndex] + 1] },
        grid: false,
        data: data,
        annotations: annotations
    });

}

function visualizeInfiniteSolutions(originalMatrix, solutions) {
    const slidersContainer = document.getElementById('slidersContainer');
    slidersContainer.innerHTML = ''; // Clear previous sliders
    document.getElementById('slidersContainer').style.display = 'block'; // Make the previews container visible

    let dependentVars = [];
    let sliders = {};

    // First pass to identify dependent variables
    solutions.forEach((solution, index) => {
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
    solutions.forEach((solution, index) => {
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

                    const label = document.createElement('label');
                    label.htmlFor = slider.id;
                    label.textContent = `${varName}: `;

                    const valueDisplay = document.createElement('span');
                    valueDisplay.textContent = slider.value;

                    // Update display as slider value changes
                    slider.oninput = () => {
                        sliders[varName] = parseFloat(slider.value);
                        updateInfinite(solutions, dependentVars, sliders, originalMatrix);
                        valueDisplay.textContent = slider.value; // Update the current value display
                    };

                    const minMaxLabel = document.createElement('div');
                    minMaxLabel.textContent = `Range: ${slider.min} to ${slider.max}`;

                    const sliderContainer = document.createElement('div');
                    sliderContainer.appendChild(label);
                    sliderContainer.appendChild(slider);
                    sliderContainer.appendChild(valueDisplay);
                    sliderContainer.appendChild(minMaxLabel);
                    slidersContainer.appendChild(sliderContainer);

                    // Initialize slider value in the map
                    sliders[varName] = parseFloat(slider.value);
                }
            }
        });
    });

    // Initial plot with default values
    updateInfinite(solutions, dependentVars, sliders, originalMatrix);
}

function updateInfinite(solutions, dependentVars, sliders, originalMatrix) {
    const plotContainer = document.getElementById('plot');
    plotContainer.innerHTML = ''; // Clear previous plot contents
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
                equationPreviewParts.push(`(${coef} * ${varName})`);
            }
        });

        // Clear the equation for the dependent variable
        // Build the function string for plotting
        let independentTerms = equationParts.join(" + ");
        let fn = `(${constantTerm}${independentTerms.length > 0 ? ` - (${independentTerms})` : ''} ) / ${dependentCoef}`;

        // Clear the equation for the dependent variable
        // Build the function string for preview
        let independentTermsPreview = equationPreviewParts.join(" + ");
        let solutionPreview = `${dependentVar} = (${constantTerm}${independentTerms.length > 0 ? ` - (${independentTermsPreview})` : ''} ) / ${dependentCoef}`;

        let computedSolution = eval(fn);
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
        width: 800,
        height: 600,
        xAxis: { label: 'X-axis', domain: [-10, 10] },
        yAxis: { label: 'Y-axis', domain: [-10, 10] },
        grid: false,
        data: data,
        annotations: annotations
    });

    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
        
    function displayKatexPreview(_title, equations) {
        const container = document.createElement('div');
        const title = document.createElement('h3');

        title.innerHTML = _title;

        equations.forEach(equation => {
            const element = document.createElement('div');
            katex.render(equation, element, {
                throwOnError: false, // Prevents KaTeX from throwing errors
                displayMode: true // Renders the equations in display mode
            });
            container.appendChild(element);
        });

        previewContainer.appendChild(title);
        previewContainer.appendChild(container);
    }

    displayKatexPreview('Solutions:', solutionsPreview);
    displayKatexPreview('Solutions replaced:', solutionsReplacedPreview);
    displayKatexPreview('Conclusion:', singlePreview);
    displayKatexPreview('Conclusion replaced:', singleReplacedPreview);
}

function visualizeNoSolutions(originalState, echelonState) {
    const initialStatePreview = document.getElementById('initialStatePreview');
    const finalStatePreview = document.getElementById('finalStatePreview');
    const noSolutionPreviewContainer = document.getElementById('noSolutionPreviewContainer');

    // Function to render matrix using KaTeX
    function renderMatrixKaTeX(matrix, container) {
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
    renderMatrixKaTeX(originalState, initialStatePreview);
    renderMatrixKaTeX(echelonState, finalStatePreview);

    // Show the preview container
    noSolutionPreviewContainer.style.display = 'block';
}

function resetForm() {
    document.getElementById('slidersContainer').innerHTML = '';
    document.getElementById('slidersContainer').style.display = 'none';
    
    document.getElementById('linear-vis-controls').style.display = 'none';
    document.getElementById('noSolutionPreviewContainer').style.display = 'none';
    document.getElementById('plot').innerHTML = '';
    document.getElementById('previewContainer').innerHTML = '';
}

export { solveEquations, visualize }