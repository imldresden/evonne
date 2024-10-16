import { globals } from "../shared-data.js";
import { upload } from '../utils/upload-file.js';
import { progress } from '../main/main.js';
import { BasicShorteningFunctions } from "../shortening/basic.js";
import { colors, stylesheet } from "../../style/cy-ontology-style.js";
import { params } from "../layouts/cola.js";
import { showRepairsTab } from "../utils/controls.js";
import { owlFunctions } from "../utils/myOWL.js";
import { throttle } from "../utils/throttle.js";

const socket = io();

let cy;
const lastDraggedPositions = {};
let showSignature = true;
let wrapLines = false;
let ontologyFile = null;
let adOntologyFile = null;
let layoutFile = null;
let showOriginal = null;
let div = "ontology-container";

const ontologyNodeId = "oN";
const flowDirection = document.getElementById("flowDirection");
const flowStrength = document.getElementById("flowStrength");
const flowStrengthReset = document.getElementById("flowStrengthReset");
const maxLengthInput = document.getElementById("maximumLength");
const btnShowSignature = document.querySelector("#btnShowSignature");
const btnWrapLines = document.querySelector("#btnWrapLines");
const btnAnimation = document.querySelector("#btnAnimation");
const lineLengthInput = document.getElementById("lineLength");
const resetLayoutButton = document.getElementById("resetLayoutButton");
const saveLayoutButton = document.getElementById("saveLayoutButton");
const showRepairsMenuButton = document.getElementById("showRepairsMenuButton");
const shortenAllInOntologyBtn = document.getElementById("shortenAllInOntologyBtn");
const openProof = document.getElementById('openProofInNew');
const resetStickyPositionsBtn = document.getElementById('resetStickyPositions');
const rerunSimulationBtn = document.getElementById('rerunSimulation');

const thingsWithListeners = [
  { type: 'click', thing: btnShowSignature, fn: btnShowSignatureFunction },
  { type: 'click', thing: btnWrapLines, fn: btnWrapLinesFunction },
  { type: 'click', thing: resetLayoutButton, fn: resetLayout },
  { type: 'click', thing: saveLayoutButton, fn: saveLayout },
  { type: 'click', thing: showRepairsMenuButton, fn: showRepairsTab },
  { type: 'click', thing: flowStrengthReset, fn: flowStrengthResetFunction },
  { type: 'click', thing: openProof, fn: openProofFunction },
  { type: 'click', thing: shortenAllInOntologyBtn, fn: shortenAllInOntology },
  { type: 'click', thing: resetStickyPositionsBtn, fn: resetStickyPositions },
  { type: 'click', thing: rerunSimulationBtn, fn: rerunSimulation },
  { type: 'input', thing: lineLengthInput, fn: throttle(labelNodes, 500) },
  { type: 'input', thing: maxLengthInput, fn: maxLengthInputFunction },
  { type: 'input', thing: flowStrength, fn: throttle(rerunLayout, 500) },
  { type: 'change', thing: flowDirection, fn: throttle(rerunLayout, 500) },
  { type: 'view_resize', thing: window, fn: () => cy.resize() },
];

// creates the content of the view based on the chosen/read data
async function createContent(data) {
  if (!document.getElementById("ontology-view")) {
    const svg = document.createElement("svg");
    svg.id = "ontology-view"
    document.getElementById(div).append(svg)  
  }
  
  const container = document.getElementById("ontology-view");
  container.innerHTML = "";

  const elements = processData(data);

  cy = cytoscape({
    container,
    style: stylesheet,
    layout: params,
    wheelSensitivity: 0.3
  });

  //added because of the default behavior in proof.js
  cy.on('layoutstop', () => {
    cy.zoom(2)
    cy.center()
  });

  const handleLayoutEvent = function (enabled) {
    return function () {
      cy.userZoomingEnabled(enabled);
      cy.userPanningEnabled(enabled);
      cy.autoungrabify(!enabled);
    };
  };

  cy.on('layoutstart', handleLayoutEvent(false));
  setTimeout(function () {
    cy.on('layoutstop', handleLayoutEvent(true));
  }, 100);

  cy.on('dragfree', 'node', function (event) {
    const nodeId = event.target.id();
    const newPosition = event.target.position();
    // Store the last dragged position of the node
    lastDraggedPositions[nodeId] = newPosition;
  });

  cy.on('tap', 'node', function (event) {
    const clickedElement = event.originalEvent.target;

    if (clickedElement && (clickedElement.classList.contains('eye-button'))) {
      const data = event.target.data();

      if (!data.revealed) {
        data.revealed = true;
      } else {
        data.revealed = false;
      }
    }
  });
  
  const timeoutMap = {};
  cy.on('mouseover', 'node', function (event) {
    if (!showOriginal) {
      const n = event.target.isNode() ? event.target : null
      n.data("hovered", true)
      clearTimeout(timeoutMap[n.data().id]) 
    }
  });

  cy.on('mouseout', 'node', function (event) {
    if (!showOriginal) {
      const n = event.target.isNode() ? event.target : null
      n.data("hovered", true)
      timeoutMap[n.data().id] = setTimeout(() => {
        n.data("hovered", false)  
      }, 500);
    }
  });

  cy.params = structuredClone(params);
  cy.stylesheet = stylesheet;
  cy.add(elements);
  await initHTML();
  bindListeners();
  cy.layout(cy.params).run();
  setupOntologyMinimap(cy);
  return cy;
}

function resetStickyPositions() {
  Object.keys(lastDraggedPositions).forEach(function (nodeId) {
    const node = cy.$id(nodeId);
    node.unlock();
    delete lastDraggedPositions[nodeId];
  });
  
  labelNodes();
}


function rerunSimulation() {
  labelNodes();
}

function getNodeTextList(data) {
  let tmpText = showSignature ? data.signature.split("\n") : data.axioms.split("\n");
  const text = showOriginal || data.revealed ? [...tmpText] : tmpText.map(x => globals.labelsShorteningHelper.shortenLabel(x, true, globals.shorteningMethod));
  return text.sort((e1, e2) => e1.length - e2.length || e1.localeCompare(e2));
}

async function initHTML() {
  const nodesHTML = document.getElementsByClassName(`cy-html`);

  // the html layer lives here, remove it before creating a new one
  if (nodesHTML[0] && nodesHTML[0].parentNode && nodesHTML[0].parentNode.parentNode) {
    nodesHTML[0].parentNode.parentNode.remove();
  }

  await cy.nodeHtmlLabel([
    {
      query: 'node',
      tpl: function (data) {
        //const text = getNodeText(data);
        const text = getNodeTextList(data);
        
        let html = `
          <div>
            <img src=${
              (data.revealed ? '../icons/eye-crossed.svg' : '../icons/eye.svg')} 
              class="eye-button ${
              (data.hovered ? "eye-on" : "eye-off") 
              }" width='14' height='14'>
          </div>
          <div class='node-title ${data.hovered ? "eye-on-text" : "eye-off-text"}'>`;

        let longestn = 1;
        for (let i = 0; i < text.length; i++) {
          let color = 'black';
          if (cy.justification && cy.justification.has(text[i])) {
            color = colors.justNodeStroke;
          }
          if (cy.diagnoses && cy.diagnoses.has(text[i])) {
            color = colors.diagNodeStroke;
          }

          html += `<p style="color:${color};margin:0;padding:0"> ${text[i]} </p>`;

          if (text[i].length > longestn) {
            longestn = text[i].length;
          }
        }
        
        html += `</div>`;
        data.boxH = calcBoxHeight(text);
        data.boxW = calcBoxWidth(longestn);

        const template = `
          <div class="cy-html node ontNode bg-box prevent-select" id="${ontologyNodeId + data.id}"> 
            <div id="frontRect" style="padding: 5px; white-space:nowrap;">
              ${html}
            </div>
          </div>
        `;

        return template;
      }
    },
  ]);
}

function calcBoxWidth(longestString) {
  return (longestString * globals.fontCharacterWidth + 25) + "px";
}

function calcBoxHeight(stringList) {
  return (stringList.length * 20 + 15) + "px";
}

function processData(data) {
  // Compute edges
  const edges = [].map.call(data.querySelectorAll("edge"), (d) => {
    const id = d.getAttribute("id");
    const source = d.getAttribute("source");
    const target = d.getAttribute("target");

    return { data: { id, source, target } };
  });

  const nodes = [].map.call(data.querySelectorAll("node"), (d) => {
    let dataNodes, signature, axioms, axiomsMap, id;

    id = d.getAttribute("id");

    dataNodes = d.querySelectorAll("data");
    dataNodes.forEach((item) => {
      if (item.getAttribute("key") === "signature") {
        signature = item.textContent;
      } else if (item.getAttribute("key") === "axioms") {
        axioms = item.textContent;
        axiomsMap = {};
        axioms.split("\n").forEach((a, i) => {
          axiomsMap[a] = i;
        });
      }
    });

    const edgeFromParent = edges.find((edge) => edge.source === id);
    const parentId = edgeFromParent == null ? "" : edgeFromParent.target;

    const text = getNodeTextList({ signature, axioms });
    let longest = 1;
    text.forEach(l => {
      if (l.length > longest) {
        longest = l.length;
      }
    });

    return {
      data: {
        id,
        signature,
        axioms,
        axiomsMap,
        parentId,
        boxH: calcBoxHeight(text),
        boxW: calcBoxWidth(longest)
      }
    };
  });

  return {
    nodes,
    edges,
  };
}

function bindListeners() {
  cy.nodes().forEach(function (n) {
    n.bind('mouseover', function (e) {
      if (n.selected()) {
        n.preSelected = true;
      } else {
        n.preSelected = false;
      }
      n.json({ selected: true });
    });

    n.bind('mouseout', function (e) {
      if (!n.preSelected) {
        n.json({ selected: false });
      }
    });

    n.on('cxttap', function (e) {
      n.toggleClass('fixed-diagnosis');
      n.fixed = !n.fixed;

      restoreColor(true, cy);
      filterRepairs(cy);
    });

    n.on('dblclick', function (e) {
      const d = n.data();
      socket.emit("euler view", { id: d.id, parent: d.parentId, axioms: d.axioms.split("\n") })
    });
  });
}

async function labelNodes(layout = true) {
  cy.startBatch();
  const nodesHTML = [...document.getElementsByClassName(`cy-html`)];
  nodesHTML.forEach(node => {
    if (node.parentNode && node.parentNode.parentNode) {
      node.parentNode.parentNode.remove();
    }
  });
  cy.nodes().forEach(function (node) {
    node.removeStyle();
    const d = node.data();
    const text = getNodeTextList(d);
    let longest = 1;
    text.forEach(l => {
      if (l.length > longest) {
        longest = l.length;
      }
    });
    d.boxH = calcBoxHeight(text);
    d.boxW = calcBoxWidth(longest);
    d.revealed = false;
  });
  await initHTML();
  cy.style().update();
  cy.endBatch();
  if (layout) {
    keepNodes();
  }
}

function loadOntology(e) {
  const ontology = e.target.files[0];
  progress('Uploading...');
  upload(ontology, uploaded => {
    console.log('Uploaded: ', uploaded);
    progress('Ontology uploaded.');
    progress('Extracting concept names...');

    //Ontology file name changes after translating to OWL/XML format
    fetch('/extract-names/?id=' + getSessionId() + '&ontology=' + owlFunctions.getOWlFileName(ontology.name) + '&reasoner=' +
      document.getElementById('classificationReasoner').value)
      .then(computed => {
        console.log('concepts extracted: ', computed);
        progress('Concepts extracted.');
        progress('Redirecting....');

        setTimeout(() => {
          window.location.replace("/?id=" + getSessionId());
        }, 2000);
      })
      .catch(error => {
        console.error('Error:', error);
      });
    document.getElementById("reasoner-choice-upload").style.display = "none";
  }, 'ontology' );
}

function loadAtomicDecomposition(e) {
  adOntologyFile = e.target.files[0];
  upload(adOntologyFile, result => {
    console.log('Success:', result);
    d3.xml("../data/" + getSessionId() + "/" + adOntologyFile.name).then((xml) => {
      createContent(xml,);
    });
  });
}

function saveLayout() {
  const json = cy.json();
  const data = {
    ontology: `${adOntologyFile.name}`,
    cyExport: { elements: json.elements },
    flags: { signature: showSignature, original: showOriginal, wrap: wrapLines }
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const dl = document.getElementById('download');
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", adOntologyFile.name.substring(0, adOntologyFile.name.indexOf(".")) + "_layout.json");
  dl.click();
}

function loadLayout(e) {
  layoutFile = e.target.files[0];

  const reader = new FileReader();

  reader.onload = async (e) => {
    const result = JSON.parse(e.target.result);

    if (!result.ontology || !result.cyExport) {
      M.toast({ html: 'Warning: JSON file is malformed' })
      console.error('JSON file is malformed')
      return;
    }
    if (!adOntologyFile) {
      M.toast({ html: 'Warning: No ontology file loaded' })
      console.error('No ontology file loaded')
      return;
    }

    showOriginal = result.flags.original;
    showSignature = result.flags.signature;
    wrapLines = result.flags.wrap;
    await labelNodes(false);
    cy.json(result.cyExport);
  }

  reader.readAsText(layoutFile);
}

function init_ontology({
  ad,
  ontology,
  container = "ontology-container",
}) {
  div = container;

  adOntologyFile = {
    name: ontology ? ad : 'atomic ontology.xml'
  };

  ontologyFile = {
    name: ontology
  };

  socket.on('highlight axioms', (data) => {
    restoreColor(false, cy);
    if (data && data.id === getSessionId()) {
      highlightNodesOf(data.pre, cy);
    }
  });

  socket.on('set ontology', (data) => {
    if (data && data.id === getSessionId()) {
      if (!adOntologyFile) {
        computingRepairsFailed("Please select an ontology file");
      } else {
        showRepairsTab(false); // from controls.js
        computingRepairs();
        socket.emit('get repairs', {
          id: data.id,
          axiom: data.axiom,
          ontologyFile: ontologyFile.name,
          reasoner: document.getElementById('diagnosesReasoner').value
        });
      }
    }
  });

  socket.on('read repairs', (data) => {
    if (data && data.id === getSessionId()) {
      if (data.msg === "mDs.txt is now available!") {
        readRepairs({ axiom: data.axiom, file: "../data/" + data.id + "/mDs_" + data.id + ".txt", cy });
      } else {
        computingRepairsFailed(data.msg);
      }
    }
  });

  // CONTROLS ==========================================
  btnShowSignature.checked = true;
  btnWrapLines.checked = false;
  btnAnimation.checked = true;
  lineLengthInput.closest(".modal-option.modal-option-range").style.display = "none";
  maxLengthInput.closest(".input-range-wrapper").style.display = "none";
  flowStrength.max = 500;
  flowStrength.min = 10;
  flowStrength.value = params.flow.minSeparation;

  document.querySelectorAll("input[type=range]").forEach(range => {
    function rangeFunction() {
      range.closest(".modal-option-range").querySelector("span.new.badge").innerText = range.value;
    }

    rangeFunction();

    range.removeEventListener("input", rangeFunction);
    range.addEventListener("input", rangeFunction);
  });

  d3.xml("../data/" + getSessionId() + "/" + adOntologyFile.name).then((xml) => {
    createContent(xml);
  });

  showOriginal = true;
  updateShorteningButton();

  // set listeners
  thingsWithListeners.forEach(twl => {
    twl.thing.removeEventListener(twl.type, twl.fn);
    twl.thing.addEventListener(twl.type, twl.fn);
  });
}

function shortenAllInOntology() {
  // Removing all the nodes which will be reseted by LabelNodes
  const nodesHTML = [...document.getElementsByClassName(`cy-html`)];
  nodesHTML.forEach(node => {
    if (node.parentNode && node.parentNode.parentNode) {
      node.parentNode.parentNode.remove();
    }
  });
  //Update shortening button
  showOriginal = !showOriginal
  !showOriginal ? document.getElementById('ontology-view').classList.remove("complete-ontology") : document.getElementById('ontology-view').classList.add("complete-ontology");
  updateShorteningButton(this);
  labelNodes();
}

function resetLayout() {
  cy.params = structuredClone(params);
  cy.layout(cy.params).run()
}

function updateShorteningButton() {
  if (showOriginal) {
    shortenAllInOntologyBtn.textContent = "Shorten all";
    shortenAllInOntologyBtn.title = "Shorten all text in the ontology";
  } else {
    shortenAllInOntologyBtn.textContent = "Undo shortening";
    shortenAllInOntologyBtn.title = "Undo shortening effect in the ontology";
  }
}

function btnShowSignatureFunction() {
  showSignature = this.checked;
  if (globals.labelsShorteningHelper instanceof BasicShorteningFunctions) {
    globals.labelsShorteningHelper.resetAll();
  }
  labelNodes();
}

function btnWrapLinesFunction() {
  wrapLines = this.checked;
  lineLengthInput.closest(".modal-option.modal-option-range").style.display = this.checked ? "block" : "none";
  labelNodes();
}

function maxLengthInputFunction() {
  if (!showOriginal) {
    labelNodes();
  }
}

function flowStrengthResetFunction() {
  flowStrength.value = params.flow.minSeparation;
  rerunLayout();
}

function openProofFunction() {
  window.open('/proof?id=' + getSessionId())
}

function keepNodes() {
  if (btnAnimation.checked === false) {
    cy.params.maxSimulationTime = 1;
    cy.params.animate = true,
      cy.params.animationDuration = undefined,
      cy.params.animationThreshold = 1,
      cy.params.fit = false;
    cy.params.centerGraph = false;
  }
  else {
    cy.params.animate = true,
      cy.params.animationDuration = 500,
      cy.params.maxSimulationTime = 2000;
    cy.params.fit = false;
    cy.params.centerGraph = true;
  }
  Object.keys(lastDraggedPositions).forEach(function (nodeId) {
    const node = cy.$id(nodeId);
    const lastPosition = lastDraggedPositions[nodeId];
    // Set the position of the node to its last dragged position
    node.position(lastPosition);
    // Lock the position to maintain it even after layout
    node.lock();
  });
  cy.layout(cy.params).run();
  let layoutStopTimer;

  cy.on('layoutstart', function (event) {
    clearTimeout(layoutStopTimer); // Clear any existing timer
    handleLayoutEvent(false);
  });

  cy.on('layoutstop', function (event) {
    clearTimeout(layoutStopTimer); // Clear any existing timer
    layoutStopTimer = setTimeout(function () {
      handleLayoutEvent(true);
    }, 500);
  });

  const handleLayoutEvent = function (enabled) {
    cy.userZoomingEnabled(enabled);
    cy.userPanningEnabled(enabled);
    cy.autoungrabify(!enabled);
    if (enabled === true) {
      Object.keys(lastDraggedPositions).forEach(function (nodeId) {
        const node = cy.$id(nodeId);
        node.unlock();
      });
    };
  };
}

function rerunLayout(e) {
  cy.params.flow = {
    axis: flowDirection.value,
    minSeparation: +flowStrength.value,
  }
  keepNodes();
}


function setupOntologyMinimap(cy) {
  let defaults = {
    container: "#ontology-minimap-container",
    viewLiveFramerate: 0,
    thumbnailEventFramerate: 60,
    thumbnailLiveFramerate: true,
    dblClickDelay: 200,
    removeCustomContainer: false,
    rerenderDelay: 100
  };

  cy.navigator(defaults);
}

export { loadOntology, loadAtomicDecomposition, loadLayout, init_ontology }