import {AxiomClass, Domain, FunctionDomainRange, Range} from "./dataStructure.js";

/**
 * Class which handles our infix to postfix notation conversion.
 */
class PostfixConverter {

    // operators from configuration.json
    constructor(operators) {
        this.operators = operators;
    }

    /**
     * @param {string}symbol symbol of infix notation
     * @returns {boolean} symbol is an operator
     */
    isOperator(symbol) {
        // parentheses are important for our conversion and also interpreted as operators
        if (symbol === "(" || symbol === ")") return true;
        return this.getOperatorBySymbol(symbol) !== null;
    }


    /**
     *
     * @param {Array<String>}postfixExpression our complete postfix expression
     * @param {function}runFunction callback function to execute evaluation function side evaluationStructureBuilder.js
     * @returns {AxiomClass} top element of the stack
     */
    evaluatePostfixExpression(postfixExpression, runFunction) {
        let stack = [];
        //iterate over every element of our postfixExpression
        for (let i = 0; i < postfixExpression.length; i++) {
            let symbol = postfixExpression[i];
            //check if current symbol is an operator
            let isOperatorValue = this.isOperator(symbol);

            //if not an operator push on the stack as an axiom
            if (!isOperatorValue) {
                stack.push(new AxiomClass(symbol));
                continue;
            }

            // otherwise its a operate
            // apply operation to the two operands on top
            let element1 = stack.pop();
            let element2 = stack.pop();

            let operator = this.getOperatorBySymbol(symbol);

            // execute the operation and store the result in the stack
            stack.push(runFunction(operator.FunctionIdentifier, [element1, element2]))
        }

        /* in the end the top of the stack is the result (there should only be one element)
        * this could be drawn here, but because the equivalence is drawn differently we moved the draw call to the
        * evaluation function */
    }

    /**
     * disjoint, domain and range are currently not usable without postfix expression because of the different use
     * of the parenthesis where the operator is in front of them
     *
     * also two operators would come right next after each other
     *
     * example: A ⊓ disjoint(B,C,D)
     *
     * that is why we evaluate them in a different way
     *
     * @param {FunctionDomainRange|string}expression infix expression
     * @returns {boolean} expression is a special operator expression
     */

    isSpecialOperatorExpression(expression) {
        return expression instanceof FunctionDomainRange || expression.includes("disjoint");
    }

    /**
     * execute a special operator expression
     * @param {FunctionDomainRange|string}expression
     * @param {function}runFunction  callback function to execute evaluation function side evaluationStructureBuilder.js
     */
    executeSpecialOperatorExpression(expression, runFunction) {
        // execute domain/range
        if (expression instanceof FunctionDomainRange) {
            let operator = this.getOperatorBySymbol("domain");
            runFunction(operator.FunctionIdentifier, [expression]);
            return;
        }

        // execute disjoint
        if (expression.includes("disjoint")) {
            let operator = this.getOperatorBySymbol("disjoint");
            runFunction(operator.FunctionIdentifier, [expression]);
            return;
        }

        throw "Illegal state."

    }

    /**
     * Convert axiom from infix to postfix notation
     * @param {string}infixExpression infix notation the axiom
     * @returns {Array<String>} postfix notation as array
     *
     * @see https://www.javatpoint.com/convert-infix-to-postfix-notation
     */
    infixToPostfix(infixExpression) {
        infixExpression = infixExpression.replaceAll(" ", "");
        let stack = [];
        let postfixArray = [];
        let postfixIndex = 0;

        for (let i = 0; i < infixExpression.length; i++) {

            let symbol = infixExpression[i];
            let isOperatorValue = this.isOperator(symbol);
            if (!isOperatorValue) {
                if (postfixArray.length === postfixIndex) {
                    postfixArray.push("");
                }
                postfixArray[postfixIndex] += symbol;
                continue;
            }

            if (stack.length === 0 || stack[stack.length - 1] === "(") {
                postfixIndex++;
                stack.push(symbol);
                continue;
            }

            if (symbol === "(") {
                stack.push(symbol);
                continue;
            }
            if (symbol === ")") {
                let topStackValue = stack.pop();
                while (topStackValue !== "(" && stack.length > 0) {
                    postfixArray.push(topStackValue);
                    postfixIndex++;
                    topStackValue = stack.pop();
                }
                continue;
            }

            if (stack.length > 0) {

                let symbolOperatorOfStack = stack[stack.length - 1];

                let operatorOfStack = this.getOperatorBySymbol(symbolOperatorOfStack);
                let currentOperator = this.getOperatorBySymbol(symbol);

                if (operatorOfStack.Precedence < currentOperator.Precedence) {
                    stack.push(symbol);
                    postfixIndex++;
                    continue;
                }

                if (operatorOfStack.Precedence > currentOperator.Precedence) {

                    while (stack.length > 0 && operatorOfStack.Precedence > currentOperator.Precedence) {
                        let operatorOfStackSymbol = stack.pop();
                        postfixArray.push(operatorOfStackSymbol);
                        postfixIndex += 2;
                        operatorOfStack = this.getOperatorBySymbol(operatorOfStackSymbol);
                    }
                }
            }

            if (stack.length !== 0) {
                postfixArray.push(stack.pop());
                postfixIndex += 2;
            }
            stack.push(symbol);
        }

        while (stack.length !== 0) {
            postfixArray.push(stack.pop());
        }

        return postfixArray;

    }

    /**
     * Go trough all operators inside configuration.json and return the operator the operator with a given symbol
     * @param {string}symbol symbol to look for in the operators
     * @returns {null|Object} null if there is no operator with symbol or the operator if there is one
     */
    getOperatorBySymbol(symbol) {
        for (let entry of Object.values(this.operators)) {
            if (entry.Symbol === symbol) return entry;
        }
        return null;
    }

    /**
     * Concat domain and range to one rule
     * @param {Array<String>}axiomsRaw list of all axioms as we get it from the websocket
     * @returns {*[]} list of all axioms with domain and range combined into a separate axiom
     */
    interpretAxioms(axiomsRaw) {

        let axiomsTotal = [];

        for (let i = 0; i < axiomsRaw.length; i++) {
            let axiom = axiomsRaw[i];

            // the axiom includes domain or range transform the axiom into a Domain/Range object
            // otherwise just push the axiom
            if (axiom.includes("domain")) {
                axiomsTotal.push(new Domain(axiom));
            } else if (axiom.includes("range")) {
                axiomsTotal.push(new Range(axiom));
            } else {
                axiomsTotal.push(axiom);
            }
        }

        // collect all domains and range
        let domainRanges = {}

        // collect all other axioms
        let axioms = [];

        for (let axiom of axiomsTotal) {
            // if a axiom is instanceof Domain and Range we want to find the partner of this axiom
            if (axiom instanceof Domain || axiom instanceof Range) {
                // for that we first look if there is already a axiom with the same functionName
                // if not we create one
                if (domainRanges[axiom.functionName] === undefined) {
                    domainRanges[axiom.functionName] = new FunctionDomainRange(undefined, undefined);
                }

                // then we set the corresponding part to the FunctionDomainRange object
                let key = axiom instanceof Domain ? "domainObject" : "rangeObject";
                domainRanges[axiom.functionName][key] = axiom;

                // if there shouldn't be a partner the "other" part will be undefined.
                // We handle this inside (evaluationStructureBuilder.js evaluateSpecialOperator)

            } else {
                axioms.push(axiom);
            }
        }

        // in the end add all Domain/Range axioms to the other axioms
        for (let domainRange of Object.values(domainRanges)) {
            axioms.push(domainRange);
        }

        return axioms;
    }

}

/**
 * Object to interact with outside of this file (to initialize the operators from euler.js / configuration.json)
 * @type {PostfixConverter}
 */
const postfixConverter = new PostfixConverter();

export {postfixConverter}