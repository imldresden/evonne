//The following works under the following assumptions:
//				- there is a div with "repairsDiv" as an ID and contains
//					- a label with ID = "closeRepairsMenuButton"
//					- a div with ID = "notificationDiv" to show diagnosis computation status
//				- there is a button with "showRepairsMenuButton" as an ID
//				  to show the hidden repairs menu
//
//Call "readRepairs(axiom,ontology)" to show diagnoses in the repairs menu
//Call "highlightNodesOf(axioms)" to change the color of the provided axioms
//Call "computingRepairs()" to show a visual indicator that repairs are beeing computed
//Call "computingRepairsFailed()" to show an error message if repairs could not be computed
//
//=========================================================================================

//TODO: 1- pin repairs to compare them with different colors
//TODO: 2- allow nodes to be protected, hence filtering the repairs (keep the ones that does not involve the selected nodes)

//Frequently selected objects
const repairsMenu = d3.select("#repairsDiv");
const closeButton = d3.select("#closeRepairsMenuButton");
const notificationDiv = d3.select("#notificationDiv");
const ontologyNodeId = "oN";
const emptyChar = "\u0020";
const dot = ".";
const computingStr = "Computing";
let computingInterval;
let dotSum = 1;
const dotMax = 3;
let repairGroups;

//Main function to read and display the repairs
function readRepairs({ axiom, file } = {}) {
  let repair;
  const repairs = [];

  d3.dsv(";", file).then((txt) => {
    d3.keys(txt).forEach((key) => {
      if (key !== "columns") {
        repair = [];
        d3.keys(txt[key]).forEach((column) => {
          let repairPart = txt[key][column].trim();
          if (repairPart !== "") {
            if (txt["columns"].indexOf(column) !== 0) {
              repairPart = "\n  " + repairPart;
            }
            repair.push(repairPart);
          }
        });
        repairs.push({ repair, size: repair.length });
      }
    });
    showRepairs(repairs);
    document.getElementById("diagnoses-axiom").innerHTML = axiom;
    document.getElementById("diagnoses-title").innerHTML = "Diagnoses for";
  });
}

//Clean the repairs menu by removing only active components
function clearRepairs() {
  hideNotification();

  d3.select("#repairsDiv")
    .selectAll("div")
    .filter(function () {
      return (
        d3.select(this).attr("id") !== "defaultDiv" &&
        d3.select(this).attr("id") !== "notificationDiv"
      );
    })
    .remove();
  d3.select("#repairsDiv").selectAll("button").remove();
}

//Notify the user in case the repairs computation was not successful
function computingRepairsFailed(msg) {
  notify(msg);
}

//Notify the user that the repairs are being computed
function computingRepairs() {
  notify(getComputingNotification());
  computingInterval = setInterval(function () {
    notificationDiv.text(getComputingNotification());
  }, 350);
}

function restartSimulation() {
  document.dispatchEvent(new CustomEvent("restart", {
    detail: {
      updateLabels: true,
    }
  }));
}

// Create a string of a constant width of the form "Computing" + n dots + m empty characters
// to simulate loading visual effect.
// Done this way to remove disturbance caused by central text alignment
function getComputingNotification() {
  let res = computingStr;

  for (let i = dotMax - dotSum; i < dotMax; i++) {
    res += dot;
  }

  for (let i = dotSum; i < dotMax; i++) {
    res += emptyChar;
  }

  if (dotSum === dotMax) {
    dotSum = 1
  } else {
    dotSum++;
  }

  return res;
}

//the main function to notify the user of the repair computation status
function notify(message) {
  clearRepairs();

  notificationDiv.text(message);

  showNotification();
}

function getRepairPanelID(key) {
  return "RP" + key;
}

function getRepairGroupButtonID(key) {
  return "RGB" + key;
}

//Classify the repairs into groups based on size and adding them to the repairs menu
function showRepairs(repairs) {
  let fixed = "";
  clearRepairs();

  // Creating repair groups based on their size
  repairGroups = createMap(repairs);

  // Sort keys ascending
  const orderedKeys = Array.from(repairGroups).map(g => g[0]).slice().sort((a, b) => a - b);

  orderedKeys.forEach((key) => {
    // Adding repairs group button
    repairsMenu
      .append("button")
      .attr("class", "accordion")
      .attr("id", getRepairGroupButtonID(key))
      .text("Diagnoses of size " + key);

    // Adding the div where the repairs would be shown
    repairsMenu
      .append("div")
      .attr("class", "panel")
      .attr("id", getRepairPanelID(key));

    // Adding the show / hide functionality of the div to the group button
    d3.select("#" + getRepairGroupButtonID(key)).on("click", () => {
      showHideGroup(key);
    });

    // Adding repairs
    repairGroups.get(key).forEach((repair) => {
      const repairPanel = d3.select("#" + getRepairPanelID(key));
      const buttonId = "repair:" + repair;
      const panel = repairPanel
        .append("button")
        .attr("id", buttonId)
        .attr("class", "repair-entry")
        .on("click", () => {
          if (fixed === buttonId) {
            fixed = "";
          } else {
            if (fixed !== "") {
              document.getElementById(fixed).classList.remove("hovered");
              document.getElementById(fixed).classList.remove("locked");
              restoreColor(true);
            }
            fixed = buttonId;
            document.getElementById(buttonId).classList.add("hovered");
            document.getElementById(buttonId).classList.add("locked");
            highlightOntology(repair);
          }
        })
        .on("mouseover", () => {
          if (fixed === "") {
            document.getElementById(buttonId).classList.add("hovered");
            highlightOntology(repair);
          }
        })
        .on("mouseout", () => {
          if (fixed === "") {
            document.getElementById(buttonId).classList.remove("hovered");
            document.getElementById(buttonId).classList.remove("locked");
            restoreColor(true);
          }
        })
      const lines = panel.append("div").attr("class", "repair-lines")
      lines.append("span")
        .attr("class", "repair-line")
        .text(repair);

      panel.append("div")
        .attr("class", "lock-sign material-icons")
        .text("\ue897")
    });
  });

  filterRepairs();
}

//Highlight affected modules by the selected repair
function highlightOntology(data) {
  data.forEach((repairAxiom) => {
    const trimmedAxiom = repairAxiom.trim();
    d3.select("#ontology-view").selectAll(".ontNode").each((node) => {
      if (!node || node.axiomsMap[trimmedAxiom] === undefined) {
        return;
      }

      const currentNode = d3.select("#" + ontologyNodeId + node.id);
      highlightDiagnosisEffect(node.id);
      currentNode
        .selectAll("text")
        .filter(function (d, i) {
          let nodeText = d3.select(this).text();
          return (
            d.axiomsMap[trimmedAxiom] !== undefined && trimmedAxiom === nodeText
          );
        })
        .style("fill", "var(--color-node-stroke-highlighted-repair)");

      //Highlight only the circles of the predecessors
      highlightPredecessors(node.id);
    });
  });
}

//Reset colors of all components to default
function restoreColor(resetButtons = false) {
  if (resetButtons) {
    document.querySelectorAll('.btn-highlight.active').forEach(button => button.classList.remove("active"));
  }

  d3.select("#ontology-view").selectAll(".node").each((node) => {
    if (!node) {
      return;
    }
    d3.select("#" + ontologyNodeId + node.id)
      .selectAll("text")
      .style("fill", (d) => !d.fixed ? "black" : "gray")
      .select(function () {
        return this.parentElement.parentElement;
      })
      .select("rect")
      .each(d => {
        d.tempRevealed = false;
      })
      .style("fill", "var(--color-node-fill)")
      .style("stroke", "var(--color-node-stroke)");
  });
}

//Highlight all affected modules
function highlightPredecessors(nodeID) {
  highlightDiagnosisEffect(nodeID);
  d3.selectAll(".ontLink").each(function (d) {
    if (!d) {
      return;
    }
    if (d.target.id === nodeID) {
      highlightPredecessors(d.source.id);
    }
  });
}

//Highlight axioms and nodes of the justification
function highlightNodesOf(data) {
  data.forEach((axiom) => {
    const trimmedAxiom = axiom.trim()
    d3.select("#ontology-view").selectAll(".ontNode").each((node) => {
      if (node.axiomsMap[trimmedAxiom] !== undefined) {
        const currentNode = d3.select("#" + ontologyNodeId + node.id);
        //Highlight the corresponding axiom
        currentNode
          .selectAll("text")
          .filter(function () {
            return d3.select(this).text() === trimmedAxiom;
          })
          .style("fill", "var(--color-node-text-fill-highlighted)");
        currentNode.select("rect")
          .style("fill", "var(--color-node-fill-highlighted)")
          .style("stroke", "var(--color-node-stroke-highlighted)");
      }
    });
  });
}

//Map the provided repairs to their size
function createMap(repairs) {
  const result = new Map();

  repairs.forEach((entry) => {
    if (result.has(entry.size)) {
      result.get(entry.size).push(entry.repair);
    } else {
      result.set(entry.size, [entry.repair]);
    }
  });

  return result;
}

//Show and hide the repairs group
function showHideGroup(key) {
  const groupButton = document.getElementById(getRepairGroupButtonID(key));

  groupButton.classList.toggle("active");
}

//Show the notification div
function showNotification() {
  const notificationDivScrollHeight = notificationDiv.property("scrollHeight") + "px";
  notificationDiv.style("max-height", notificationDivScrollHeight);
}

//Hide the notification div
function hideNotification() {
  notificationDiv.style("max-height", "0px");
  clearInterval(computingInterval);
}

function highlightDiagnosisEffect(nodeID) {
  d3.select("#" + ontologyNodeId + nodeID)
    .select("rect")
    .style("fill", "var(--color-node-fill-highlighted-repair)")
    .style("stroke", "var(--color-node-stroke-highlighted-repair)")
    .each(d => {
      d.tempRevealed = true;
    });
}

function filterRepairs() {
  if (repairGroups) {
    const orderedKeys = Array.from(repairGroups).map(g => g[0]).slice().sort((a, b) => a - b);
    d3.selectAll(".repair-entry").classed("hidden", false);
    d3.selectAll(".fixed-repairs").data().forEach(node => {
      orderedKeys.forEach((key) => {
        repairGroups.get(key).forEach((repair) => {
          repair.forEach(r => {
            if (node.axiomsMap[r.trim()] !== undefined) {
              document.getElementById("repair:" + repair).classList.add("hidden");
            }
          });
        });
      });
    });
  } else {
    console.log('no diagnoses computed yet')
  }
  
}
