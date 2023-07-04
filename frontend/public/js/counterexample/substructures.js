/**
 * This file extracts important structures from axioms
 */
import {Edge, Node, Snapshot} from "./datastructure.js";

/**
 * edge of a graph to search elements of a substructure
 */
class SubstructureGraphEdge {

    /**
     * @param {string}label role name of the edge
     * @param {SubstructureGraphNode}target target of the edge
     * @param {number}id id of the edge
     */
    constructor(label, target, id) {
        this.label = label;
        this.target = target;
        this.id = id;
    }
}

/**
 * node of a graph to search elements of a substructure
 */
class SubstructureGraphNode {
    /**
     *
     * @param {string}id id from {@link Node#id}
     * @param {string}element element from {@link Node#element}
     * @param {string}importantLabel important label from {@link Node#importantLabel}
     */
    constructor(id, element, importantLabel) {
        this.id = id;
        this.element = element;
        this.importantLabel = importantLabel;
        this.edges = []
    }
}

/**
 * Graph to find substructures
 */
class SubstructureGraph {
    constructor(snapshot) {
        this.nodes = {}
        // initialize nodes
        for (let node of snapshot.nodes) {
            this.nodes[node.element] = new SubstructureGraphNode(node.id, node.element, node.importantLabel);
        }

        // initialize edges
        for (let edge of snapshot.edgesWithNodeObject) {
            let source = this.nodes[edge.source.element];
            for (let subLabel of edge.label) {
                source.edges.push(new SubstructureGraphEdge(subLabel, this.nodes[edge.target.element], edge.id));
            }
        }
    }

    /**
     * Find all substructures from the mapper.json file
     * @param {Object}mapping see mapper.json
     * @returns {Object<string,Snapshot>} mapping of all found {@link Snapshot} that represent the structures to the corresponding element {@link Node#element}
     */
    buildSubstructures(mapping) {

        let substructures = {};
        for (let [key, value] of Object.entries(mapping)) {
            let element = this.nodes[value];

            // generate postfix expression
            let postfix = convertInfixToPostfix(key);
            if (postfix === undefined || postfix.length < 3) continue;

            // evaluate chain from postfix
            let chain = evaluate(postfix);

            chain.chain.reverse();

            let snapshot = new Snapshot();
            let source = new Node(element.id, element.element, []);
            let currentEdge = new Edge([], source, undefined, undefined);

            // find the element of the cain inside the search graph
            for (let i = 0; i < chain.chain.length; i++) {
                let partOfChain = chain.chain[i];
                if (i === 0) {
                    snapshot.add(source);
                    if (partOfChain instanceof ChainNode) {
                        source.labels = [partOfChain.label];
                        continue;
                    }
                }

                if (partOfChain instanceof ChainEdge) {
                    if (i + 1 >= chain.chain.length) {
                        console.log("Illegal state, Edge without target");
                    }
                    let target = chain.chain[i + 1];
                    for (let edge of element.edges) {

                        if ("∃" + edge.label === partOfChain.label && edge.target.importantLabel === target.label) {
                            currentEdge.label = [edge.label];
                            let targetNode = new Node(edge.target.id, edge.target.element, [target.label]);
                            currentEdge.target = targetNode;
                            currentEdge.id = edge.id;
                            snapshot.add(targetNode);
                            snapshot.add(currentEdge);
                            currentEdge = new Edge([], targetNode, undefined, undefined);
                            i++;
                            element = this.nodes[edge.target.element];
                            break;
                        }

                    }
                    continue;
                }

                console.log("Illegal state");
            }
            snapshot.importantLabel = key;
            substructures[value] = snapshot;
        }

        return substructures;
    }
}

/**
 * Class that represents an operator for the postfix algorithm
 */
class Operator {
    /**
     * @param {string}symbol of the operator
     * @param {number}precedence of the operator
     */
    constructor(symbol, precedence) {
        this.symbol = symbol;
        this.precedence = precedence;
    }
}

/**
 * List of all possible operators
 * @type {Operator[]}
 */
const OPERATORS = [
    new Operator("⊓", 1),
    new Operator(".", 2),
    new Operator("(", 0),
    new Operator(")", 0),
]

/**
 * Get an {@link Operator} by symbol
 * @param {string}symbol symbol of the operator
 * @returns {Operator|undefined} undefined if no operator was found, otherwise the operator
 */
function getOperator(symbol) {
    for (let operator of OPERATORS) {
        if (operator.symbol === symbol) return operator;
    }
    return undefined;
}

/**
 * Checks if a symbol is an operator
 * @param {string}symbol symbol to check
 * @returns {boolean} is the symbol an operator or not
 */
function isOperator(symbol) {
    if (symbol === "(" || symbol === ")") return true;
    for (let operator of OPERATORS) {
        if (operator.symbol === symbol) return true;
    }
    return false;
}

/**
 * Check if a symbol is valid character for axioms of category 2, see Großer Beleg
 * @param {string}symbol to check
 * @returns {boolean} is the character valid for category 2 or not
 */
function isValidLetter(symbol) {
    return /^[a-zA-Z0-9]|∃|⊤$/.test(symbol);
}

/**
 * Checks if symbol is a white space
 * @param {string}symbol to check
 * @returns {boolean} is the symbol a white space
 */
function isWhiteSpace(symbol) {
    return symbol === " ";
}

/**
 * Split the string into operands and operators for further evaluation
 * @param {string}expression expression to split
 * @returns {string[]|undefined} undefined if there was a invalid character while parsing, otherwise the list of split operators and operands
 */
function expressionToArray(expression) {
    let expressionAsArray = [];
    let currentWord = "";
    for (let char of expression) {
        if (isWhiteSpace(char)) {
            continue;
        }
        if (isOperator(char)) {
            if (currentWord.length > 0) {
                expressionAsArray.push(currentWord);
                currentWord = "";
            }
            expressionAsArray.push(char);
            continue;
        }
        if (isValidLetter(char)) {
            currentWord += char;
            continue;
        }
        return undefined;
    }
    if (currentWord.length > 0) {
        expressionAsArray.push(currentWord);
    }
    return expressionAsArray;
}

/**
 * Convert the axiom to the postfix form
 * @param {string}expression Expression to be transformed
 * @returns {string[]|undefined} undefined if there was a invalid state of a structure while parsing, otherwise expression as postfix
 */
function convertInfixToPostfix(expression) {
    let expressionArray = expressionToArray(expression);
    if (expressionArray === undefined) return undefined;

    let stack = [];
    let postfixArray = [];

    for (let operand of expressionArray) {
        let isOperatorValue = isOperator(operand);

        if (!isOperatorValue) {
            postfixArray.push(operand);
            continue;
        }


        if (operand === ")") {
            while (stack[stack.length - 1] !== "(") {
                postfixArray.push(stack.pop());
            }
            stack.pop();
            continue;
        }
        if (operand === "(") {
            stack.push(operand);
            continue;
        }

        if (stack.length === 0 || stack[stack.length - 1] === "(") {
            stack.push(operand);
            continue;
        }

        let currentOperator = getOperator(operand);
        let topOperator = getOperator(stack[stack.length - 1]);

        if (currentOperator.precedence > topOperator.precedence) {
            stack.push(operand);
            continue;
        }

        while (currentOperator.precedence <= topOperator.precedence && stack.length > 0) {
            postfixArray.push(stack.pop())
            topOperator = getOperator(stack[stack.length - 1]);
        }

        stack.push(operand);
    }

    while (stack.length > 0) {
        postfixArray.push(stack.pop());
    }

    return postfixArray;

}

/**
 * Node Element of a chain
 */
class ChainNode {
    constructor(label) {
        this.label = label;
    }
}

/**
 * Edge Element of a chain
 */
class ChainEdge {
    constructor(label) {
        this.label = label;
    }
}

/**
 * chain, has alternately a {@link ChainNode} and an {@link ChainEdge}
 */
class Chain {
    constructor() {
        this.chain = [];
    }

    add(chainElement) {
        this.chain.push(chainElement);
    }

}

/**
 * Create a chain for the postfix notation of an axiom
 * @param {string[]}array expression in postfix form
 * @returns {Chain} returns resulting chain
 */
function evaluate(array) {
    let stack = [];
    for (let operator of array) {
        if (!isOperator(operator)) {
            stack.push(operator);
            continue;
        }

        let operand1 = stack.pop();
        let operand2 = stack.pop();

        if (operator === ".") {
            if (typeof (operand1) === "string" && typeof (operand2) === "string") {
                stack.push(handleDotOperatorBothStrings(operand1, operand2));
                continue;
            }

            if (operand1 instanceof Chain && typeof (operand2) === "string") {
                operand1.add(new ChainEdge(operand2));
                stack.push(operand1);
                continue;
            }

            if (operand2 instanceof Chain && typeof (operand1) === "string") {
                operand2.add(new ChainEdge(operand1));
                stack.push(operand2);
                continue;
            }

            if (operand1 instanceof Chain && operand2 instanceof Chain) {
                console.error("Unexpected state: Evaluation algorithm found two chains for .");
            }


        }
        if (operator === "⊓") {
            if (typeof operand1 === "string" && typeof operand2 === "string") {
                console.error("Unexpected state: Evaluation algorithm found two strings for ⊓");
            }
            if (operand1 instanceof Chain && typeof operand2 === "string") {
                operand1.add(new ChainNode(operand2));
                stack.push(operand1);
                continue;
            }
            if (operand2 instanceof Chain && typeof operand1 === "string") {
                operand2.add(new ChainNode(operand1));
                stack.push(operand2);
            }
        }
    }

    return stack.pop();
}

/**
 * Handels the case if there are two strings and a dot operator while evaluating the postfix expression
 * @param {string}operand1 first operand
 * @param {string}operand2 second operand
 * @returns {Chain|undefined} Creates a new chain element
 */
function handleDotOperatorBothStrings(operand1, operand2) {

    let chain = new Chain();
    let label, target = undefined;

    if (operand1.includes("∃") && operand2.includes("∃")) {
        console.log("Unexpected ∃ twice.");
        return undefined;
    }

    if (operand1.includes("∃")) {
        label = new ChainEdge(operand1);
        target = new ChainNode(operand2);
    }

    if (operand2.includes("∃")) {
        label = new ChainEdge(operand2);
        target = new ChainNode(operand1);
    }

    if (label === undefined && target === undefined) {
        console.log("Unexpected no ∃.");
        return undefined;
    }

    chain.add(target);
    chain.add(label);
    return chain;

}

const SUBSTRUCTURE_POP_UP_ID = "substructure_pop_up";

/**
 * Build a pop-up window for the substructure if it is going to be visualised
 * @param {Snapshot}substructure
 */
function buildPopup(substructure){
    if (document.getElementById(SUBSTRUCTURE_POP_UP_ID) !== null)
        document.getElementById(SUBSTRUCTURE_POP_UP_ID).remove();
    let popup = document.createElement("div");
    popup.id = SUBSTRUCTURE_POP_UP_ID;
    popup.style.position = "absolute";
    popup.style.bottom = "10px";
    popup.style.right = "10px";
    popup.style.backgroundColor = "white";
    popup.style.padding = "10px";
    popup.style.boxShadow= "2px 2px 2px 2px #88888888";

    let span = document.createElement("span");
    span.innerText = substructure.importantLabel;

    let svg = document.createElement("svg");
    popup.appendChild(span);
    popup.appendChild(svg);

    document.body.appendChild(popup);
}

export {SubstructureGraph, buildPopup, SUBSTRUCTURE_POP_UP_ID}