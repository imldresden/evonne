import {
  AxiomClass,
  Domain,
  FunctionDomainRange,
  Range,
} from "../euler/dataStructure.js";
import {
  getCurrentIdWithoutTag,
  runFunction,
} from "../euler/evaluationStructureBuilder.js";
import { drawEulerDiagram } from "../euler/draw.js";

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
   * @returns {SetCollection} top element of the stack
   */
  evaluatePostfixExpression(postfixExpression) {
    let stack = [];
    //iterate over every element of our postfixExpression
    let lastAxiom;

    const isSubsumption = (op) => {
      return op.FunctionIdentifier === "evaluateSubSums";
    };

    for (let i = 0; i < postfixExpression.length; i++) {
      let symbol = postfixExpression[i];

      if (i < postfixExpression.length - 1) {
        //if not an operator push on the stack as a string
        if (!this.isOperator(symbol)) {
          stack.push(symbol);
          continue;
        }

        // otherwise its an operator
        let el2 = stack.pop();
        let el1 = stack.pop();
        let op = symbol;

        //push the string representation of this sub-axiom onto the stack
        stack.push(`${el1} ${op} ${el2}`);
      } else {
        //for the last element
        //if not an operator push on the stack as an axiom
        if (!this.isOperator(symbol)) {
          stack.push(new AxiomClass(symbol));
          continue;
        }

        // otherwise its an operator
        // apply operation to the two operands on top
        let el1 = new AxiomClass(stack.pop());
        let el2 = new AxiomClass(stack.pop());
        let op = this.getOperatorBySymbol(symbol);

        // execute the operation and store the result in the stack
        stack.push(runFunction(op.FunctionIdentifier, [el1, el2]));
        lastAxiom = { operator: op, axioms: { left: el2, right: el1 } };
        break;
      }
    }
    //result is now on top of the stack
    let top = stack.pop();

    if (postfixExpression.length === 1) {
      top = runFunction("evaluateSingleSet", [top]);
    }

    //prepare for drawing: reverse set list, if subsumbtion (exclude roles)
    if (
      lastAxiom &&
      isSubsumption(lastAxiom.operator) &&
      !lastAxiom.axioms.right?.isExistence()
    ) {
      top.sets.reverse();
    }

    return top;
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
    return (
      expression instanceof FunctionDomainRange ||
      expression.includes("disjoint")
    );
  }

  /**
   * execute a special operator expression
   * @param {FunctionDomainRange|string}expression
   */
  drawSpecialOperatorExpression(expression) {
    // execute domain/range
    if (expression instanceof FunctionDomainRange) {
      let operator = this.getOperatorBySymbol("domain");
      const collection = runFunction(operator.FunctionIdentifier, [expression]);
      drawEulerDiagram(collection, getCurrentIdWithoutTag());
      return;
    }

    // execute disjoint
    if (expression.includes("disjoint")) {
      let operator = this.getOperatorBySymbol("disjoint");
      const collection = runFunction(operator.FunctionIdentifier, [expression]);
      drawEulerDiagram(collection, getCurrentIdWithoutTag());
      return;
    }

    throw "Illegal state.";
  }

  splitUp = (exp) => {
    return exp
      .replace("(", " ( ")
      .replace(")", " ) ")
      .split(" ")
      .filter((e) => e !== "");
  };

  /**
   * Convert axiom from infix to postfix notation
   * @param {string}infix infix notation the axiom
   * @returns {Array<String>} postfix notation as array
   *
   * @see http://csis.pace.edu/~wolf/CS122/infix-postfix.htm
   */
  infixToPostfix(infix) {
    console.log(`%c Infix: ${infix}`, "background: #799c78; color: #FFF");
    infix = this.splitUp(infix);
    let postfix = [];
    let stack = [];
    let top = stack;

    const precedence = (el) => {
      return this.getOperatorBySymbol(el)["Precedence"];
    };
    const decideOnPrecedence = (el) => {
      //5. If the incoming symbol has higher precedence than the top of the stack,
      // push it on the stack.
      // ++++
      //6. If the incoming symbol has equal precedence with the top of the stack, use association.
      // If the association is left to right,
      // pop and print the top of the stack and then push the incoming operator.
      // If the association is right to left, push the incoming operator.
      if (precedence(el) >= precedence(top)) {
        stack.push(el);
        console.log("#", 5 + "," + 6);
      }
      //7. If the incoming symbol has lower precedence than the symbol on the top of the stack,
      // pop the stack and print the top operator.
      // Then test the incoming operator against the new top of stack.
      else {
        postfix.push(stack.pop());
        console.log("#", 7);
        decideOnPrecedence(el);
      }
    };

    for (const el of infix) {
      top = stack[stack.length - 1] ?? [];

      //1. Print operands as they arrive.
      console.log("el:", el, "stack:", stack, "postfix:", postfix, "TOP:", top);
      if (!this.isOperator(el)) {
        postfix.push(el);
        console.log("#", 1);
        continue;
      }

      //2. If the stack is empty or contains a left parenthesis on top,
      // push the incoming operator onto the stack.
      if ((stack.length === 0 || top === "(") && this.isOperator(el)) {
        stack.push(el);
        console.log("#", 2);
        continue;
      }

      //3. If the incoming symbol is a left parenthesis, push it on the stack.
      if (el === "(") {
        stack.push(el);
        console.log("#", 3);
        continue;
      }

      //4. If the incoming symbol is a right parenthesis,
      // pop the stack and print the operators until you see a left parenthesis. Discard the pair of parentheses.
      if (el === ")") {
        let i = stack.length - 1;
        while (i >= 0) {
          let se = stack[i];

          if (se === "(") {
            stack.splice(i, 1);
            break;
          }
          postfix.push(se);
          stack.splice(i, 1);

          i--;
        }
        console.log("#", 4);

        continue;
      }

      //5., 6., 7.
      decideOnPrecedence(el);
    }

    //8. At the end of the expression, pop and print all operators on the stack.
    // (No parentheses should remain.)
    stack.forEach(() => {
      postfix.push(stack.pop());
    });

    console.log(`%c Postfix: ${postfix}`, "background: #9B789C; color: #FFF");
    console.log("\n");
    return postfix;
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
    let domainRanges = {};

    // collect all other axioms
    let axioms = [];

    for (let axiom of axiomsTotal) {
      // if a axiom is instanceof Domain and Range we want to find the partner of this axiom
      if (axiom instanceof Domain || axiom instanceof Range) {
        // for that we first look if there is already a axiom with the same functionName
        // if not we create one
        if (domainRanges[axiom.functionName] === undefined) {
          domainRanges[axiom.functionName] = new FunctionDomainRange(
            undefined,
            undefined
          );
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

export { postfixConverter };
