import { FunctionDomainRange } from "../euler/dataStructure.js";
import { updateCurrentDiagramId } from "../euler/evaluationStructureBuilder.js";
import { postfixConverter } from "./infixToPostfix.js";
import { drawer, drawEulerDiagram } from "../euler/draw.js";

let state = {
  axioms: [],
};

/**
 * initialize the backend. This method will be called first.
 */

/**
 * Basically the index of the current axiom that is parsed. This ID will be used to generate divs and svg for this axiom
 * @type {number}
 */
let indexOfCurrentEulerDiagram = 0;

/**
 * Websocket connection
 */
const socket = io();

function splitInfixAxiom(axiomArray) {
  let output = [];
  for (let i = 0; i < axiomArray.length; i++) {
    // check if axiom contains whitespaces, to see if it's a splitable term
    if (axiomArray[i].indexOf(" ") >= 0) {
      output.push.apply(
        output,
        axiomArray[i].match(/(?<=\().*(?=\))|[^\s\(\)]+|\w+(\(.*?\))?|\(|\)/g)
      ); //match brackets with content or things with space in-between, that are not in brackets
    } else {
      output.push(axiomArray[i]);
    }
  }
  return output;
}

const markPart = (axiomElement, part) => {
  let text = [axiomElement.innerText];

  while (true) {
    let temp = [];
    for (let i = 0; i < text.length; i++) {
      temp[i] = text[i].replace(/\s+/g, "");
    }
    const i = temp.indexOf(part.replace(/\s+/g, ""));
    if (i >= 0) {
      axiomElement.innerText = "";
      text.splice(
        i,
        1,
        `<span style="background: #9B789C; color: white; padding: 5px; border-radius: 5px">${part}</span>`
      );
      text = text.join(" ");
      axiomElement.insertAdjacentHTML("beforeend", text);
      break;
    } else {
      if (splitInfixAxiom(text).length === text.length) {
        break;
      } else {
        text = splitInfixAxiom(text);
      }
    }
  }
};

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
function clear(elemId) {
  // indexOfCurrentEulerDiagram = 0;
  d3.select("#" + elemId)
    .selectAll("*")
    .remove();
}

/**
 * Gets a list of axioms and draws them one by one
 * @param axioms list of axioms
 * @param elemId id of element
 */
function parse(axioms, elemId) {
  const prevAxiomData = document
    .getElementById(elemId)
    .getAttribute("axiom-data");
  document
    .getElementById(elemId)
    .setAttribute("prev-axiom-data", prevAxiomData);

  // We get a new list of axioms, which means that a new node was clicked. For that we clear the current view
  clear(elemId);

  markPart(
    document.getElementById(elemId.split("Euler")[0] + "Axiom"),
    typeof axioms[0] === "string" ? axioms[0] : axioms[0].domainObject.text
  );

  state.axioms.push(axioms);
  state.axioms = state.axioms.flat();

  // every axiom should be drawn independently
  for (let axiom of axioms) {
    // every axiom div has a title with the axiom on top. Because Domain and Range were merged to one axiom they
    // have a "special" title, which you can get via axiom.getText() (if instanceof FunctionDomainRange)
    const text = axiom instanceof FunctionDomainRange ? axiom.getText() : axiom;

    // append the main div with a new div + title of the axiom
    d3.select("#" + elemId)
      .append("div")
      .attr("id", "id" + indexOfCurrentEulerDiagram)
      .attr("class", "euler-diagram");
    // .text(text); // add title of the axiom

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
      postfixConverter.drawSpecialOperatorExpression(axiom);
    } else {
      const postfix = postfixConverter.infixToPostfix(axiom);
      const result = postfixConverter.evaluatePostfixExpression(postfix);

      const isEquivalence = Array.isArray(result);
      try {
        if (isEquivalence) {
          drawEulerDiagram(result[0], getCurrentIdWithoutTag() + "_1");
          drawEulerDiagram(result[1], getCurrentIdWithoutTag() + "_2");
        } else {
          drawEulerDiagram(result, getCurrentIdWithoutTag());
          document
            .getElementById(elemId)
            .setAttribute("axiom-data", axiom.toString());
        }
      } catch (e) {}
    }

    // increment to draw the next diagram in a new div container
    indexOfCurrentEulerDiagram++;
  }
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

function init_inference() {
  console.log("Listening to websocket ...");
  socket.on("inference view", (data) => {
    console.log("Received data: ", data);

    let axiom;
    state.axioms = [];

    // clear children and parent container
    d3.select("#inference-view-children-container").selectAll("*").remove();
    d3.select("#inference-view-parent-container").selectAll("*").remove();

    // children array
    for (let i = 0; i < data.children.length; i++) {
      d3.select("#inference-view-children-container")
        .append("div")
        .attr("id", "idChild" + i);

      //top container child
      d3.select("#idChild" + i)
        .append("div")
        .attr("id", "idChildContainer" + i);
      d3.select("#idChildContainer" + i).styles({
        display: "flex",
        "justify-content": "center",
        "margin-bottom": "2rem",
      });
      //child axiom
      d3.select("#idChildContainer" + i)
        .append("div")
        .attr("id", "idChild" + i + "Axiom")
        .text(data.children[i])
        .styles({ "margin-right": "1rem" })
        .on("click", function () {
          parse(
            postfixConverter.interpretAxioms([data.children[i]]),
            "idChild" + i + "Euler"
          );
          makeInteractive("idChild" + i + "Euler");
        });
      //child button
      d3.select("#idChildContainer" + i)
        .append("button")
        .text("Go back")
        .on("click", function () {
          const prev = d3
            .select("#idChild" + i + "Euler")
            .attr("prev-axiom-data");

          let check = prev.toLowerCase() !== "null";
          check &&
            parse(
              postfixConverter.interpretAxioms([prev]),
              "idChild" + i + "Euler"
            );
          makeInteractive("idChild" + i + "Euler");
        });

      d3.select("#idChild" + i)
        .append("div")
        .attr("id", "idChild" + i + "Euler")
        .attr("class", "euler-diagram");

      axiom = postfixConverter.interpretAxioms([data.children[i]]);
      parse(axiom, "idChild" + i + "Euler");
      makeInteractive("idChild" + i + "Euler");
    }
    // middle section
    d3.select("#inference-view-rule").text(data.type);

    // parent
    d3.select("#inference-view-parent-container")
      .append("div")
      .attr("id", "idParent");
    //top container parent
    d3.select("#idParent").append("div").attr("id", "idParentContainer");
    d3.select("#idParentContainer").styles({
      display: "flex",
      "justify-content": "center",
      "margin-bottom": "2rem",
    });
    //parent axiom
    d3.select("#idParentContainer")
      .append("div")
      .attr("id", "idParentAxiom")
      .text(data.parent)
      .styles({ "margin-right": "1rem" })
      .on("click", function () {
        parse(postfixConverter.interpretAxioms([data.parent]), "idParentEuler");
        makeInteractive("idParentEuler");
      });
    //parent button
    d3.select("#idParentContainer")
      .append("button")
      .text("Go back")
      .on("click", function () {
        const prev = d3.select("#idParentEuler").attr("prev-axiom-data");

        let check = prev.toLowerCase() !== "null";
        check &&
          parse(postfixConverter.interpretAxioms([prev]), "idParentEuler");
        makeInteractive("idParentEuler");
      });

    d3.select("#idParent")
      .append("div")
      .attr("id", "idParentEuler")
      .attr("class", "euler-diagram");

    axiom = postfixConverter.interpretAxioms([data.parent]);

    parse(axiom, "idParentEuler");
    makeInteractive("idParentEuler");
  });

  console.log("Read configuration file ...");
  readJson("js/inference/configuration.json", function (data) {
    console.log("Success:", data);

    //Initialize the operators and colors
    postfixConverter.operators = data.Operators;
    drawer.colors = data.Colors;

    // remove this command to test the basic operations
    //unitTest();
    console.log("Finished initialization.");
  });
}

function makeInteractive(containerId) {
  d3.select("#" + containerId)
    .selectAll(".venn-circle")
    .select("path")
    .on("click", function () {
      const vennData = d3.select(this.parentNode).attr("data-venn-sets");
      parse(postfixConverter.interpretAxioms([vennData]), containerId);
      makeInteractive(containerId);
    });
}

document.getElementById("inference-view") && init_inference();
