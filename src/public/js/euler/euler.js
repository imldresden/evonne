import { FunctionDomainRange } from "./dataStructure.js";
import { postfixConverter } from "./infixToPostfix.js";
import {
  runFunction,
  updateCurrentDiagramId,
} from "./evaluationStructureBuilder.js";
import { drawer } from "./draw.js";

/**
 * Basically the index of the current axiom that is parsed. This ID will be used to generate divs and svg for this axiom
 * @type {number}
 */
let indexOfCurrentEulerDiagram = 0;

/**
 * Websocket connection
 */
const socket = io();

/**
 * Returns the id of the div of the current axiom, where the svg should be created.
 * @returns {string} div id
 */
function getCurrentIdWithoutTag() {
  return "id" + indexOfCurrentEulerDiagram + "_container";
}

/**
 * Clears the view and resets the values
 */
function clear() {
  indexOfCurrentEulerDiagram = 0;
  d3.select("#euler-view").selectAll("*").remove();
}

/**
 * Gets a list of axioms and draws them one by one
 * @param axioms list of axioms
 */
function parse(axioms) {
  // We get a new list of axioms, which means that a new node was clicked. For that we clear the current view
  clear();

  // every axiom should be drawn independently
  for (let axiom of axioms) {
    // every axiom div has a title with the axiom on top. Because Domain and Range were merged to one axiom they
    // have a "special" title, which you can get via axiom.getText() (if instanceof FunctionDomainRange)
    const text = axiom instanceof FunctionDomainRange ? axiom.getText() : axiom;

    // append the main div with a new div + title of the axiom
    d3.select("#euler-view")
      .append("div")
      .attr("id", "id" + indexOfCurrentEulerDiagram)
      .attr("class", "euler-diagram")
      .text(text); // add title of the axiom

    // append the new created div with another div where the svg will be placed
    d3.select("#id" + indexOfCurrentEulerDiagram)
      .append("div")
      .attr("id", getCurrentIdWithoutTag());

    // tell the evaluationStructureBuilder.js file that we have a new index
    updateCurrentDiagramId(indexOfCurrentEulerDiagram);

    // evaluate the axiom
    // first check if it is a "special" operator (Domain/Range or disjoint). They are handled differently.
    // otherwise just handle it normally
    if (postfixConverter.isSpecialOperatorExpression(axiom)) {
      postfixConverter.executeSpecialOperatorExpression(axiom, runFunction);
    } else {
      postfixConverter.evaluatePostfixExpression(
        postfixConverter.infixToPostfix(axiom),
        runFunction
      );
    }

    // increment to draw the next diagram in a new div container
    indexOfCurrentEulerDiagram++;
  }
}

function unitTest() {
  const top = "⊤",
    bottom = "⊥",
    subsumes = " ⊑ ",
    or = "⊔",
    and = " ⊓ ",
    equivalence = " ≡ ",
    disjoint = "disjoint",
    range = "range",
    domain = "domain",
    exists = "∃",
    all = "∀";

  let tests = [
    "A" + subsumes + "B",
    "A" + equivalence + "B",
    disjoint + "(A,B,C)",
    range + "(B) = A",
    domain + "(B) = C",
    range + "(hasSpiciness) = Pizza",
    domain + "(hasBase) = PizzaBase",
    "A" + and + "C" + subsumes + "B",
    "A" + and + "C" + subsumes + "B",
    "A" + or + "C" + subsumes + "B",
    "A" + and + "C" + equivalence + "B",
    "A" + or + "C" + equivalence + "B" + and + "D",
    "A" + or + "C" + equivalence + "B" + and + exists + "hasTopping.Fruit",
    "A" + or + "C" + equivalence + "Pizza" + and + all + "hasD.D",
    "C" + subsumes + top,
    "C" + and + bottom + equivalence + top,
    "C" + and + "A" + subsumes + bottom,
    "Pizza" +
      and +
      all +
      "hasD.D" +
      equivalence +
      "Pizza" +
      and +
      all +
      "hasD.D",
    "C" + subsumes + top,
    "C" + subsumes + bottom,
    "Pizza" + and + all + "hasD.D" + subsumes + "Pizza2",
  ];

  let axioms = postfixConverter.interpretAxioms(tests);

  parse(axioms);
}

/**
 * helper function to read a .json file (we use it to read configuration.json)
 * @param url url of the .json file
 * @param callback callback function
 */
function readJson(url, callback) {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      callback(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

/**
 * initialize the backend. This method will be called first.
 */
function init_euler() {
  console.log("Listening to websocket ...");
  socket.on("euler view", (data) => {
    console.log("Received data: ", data);
    let axioms = postfixConverter.interpretAxioms(data.axioms);
    parse(axioms);
  });

  console.log("Read configuration file ...");
  readJson("js/euler/configuration.json", function (data) {
    console.log("Success:", data);

    //Initialize the operators and colors
    postfixConverter.operators = data.Operators;
    drawer.colors = data.Colors;

    // remove this command to test the basic operations
    //unitTest();
    console.log("Finished initialization.");
  });
}

document.getElementById("euler-view") && init_euler();
