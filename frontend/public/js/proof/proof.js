import { globals } from "../shared-data.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import { processData } from "./data/process-data.js";
import { upload } from '../utils/upload-file.js';

import { AxiomsHelper } from "./axioms.js";
import { RulesHelper } from "./rules/rules.js";
import { NodeVisualsHelper } from "./node-visuals.js";

import { TreeNavigation } from "./trees/tree.js";
import { LinearNavigation } from "./trees/linear.js";
import { MagicNavigation } from "./trees/magic.js";

import { proof } from "./proof.js";

function fixDecimals(num) {
  return Math.trunc(num);
}

let original = true;

const openOntology = document.getElementById('openOntologyInNew');
const proofWidthRange = document.getElementById("proofWidthRange");
const proofHeightRange = document.getElementById("proofHeightRange");

//Inputs
const maxLengthInput = document.getElementById("maximumLength");
const minHorizontalCompactnessInput = document.getElementById("minHorizontalCompactness");
const maxHorizontalCompactnessInput = document.getElementById("maxHorizontalCompactness");
const minVerticalCompactnessInput = document.getElementById("minVerticalCompactness");
const maxVerticalCompactnessInput = document.getElementById("maxVerticalCompactness");

//Selections
const shorteningMethodSelection = document.getElementById("shorteningMode");
const tooltipPositionSelection = document.getElementById("toolTipPosition");

//Toggle buttons
const allowOverlapBtn = document.getElementById("toggleAllowOverlap");
const magicToggleBtn = document.getElementById("toggleMagicMode");
const layoutToggleBtn = document.getElementById("toggleLayoutMode");
const shorteningRuleNamesBtn = document.getElementById("toggleRuleNamesShortening");
const planarToggleBtn = document.getElementById("togglePlanar");
const overlapAllowingSettings = document.getElementById("proof-overlap-allowing-settings");

//Buttons
const collapseAll = document.getElementById("collapseAll");
const shortenAllInProofBtn = document.getElementById("shortenAllInProofBtn");
const proofWidthRangeResetBtn = document.getElementById("proofWidthRangeReset");
const proofHeightRangeResetBtn = document.getElementById("proofHeightRangeReset");

//Mapping elements with click event to their function
const thingsWithListeners = [
  { type: 'click', thing: allowOverlapBtn, fn: allowOverlapBtnFunction },
  { type: 'click', thing: collapseAll, fn: collapseAllBtnFunction },
  { type: 'click', thing: shorteningRuleNamesBtn, fn: shorteningRuleNamesBtnFunction },
  { type: 'click', thing: magicToggleBtn, fn: magicToggleBtnFunction },
  { type: 'click', thing: layoutToggleBtn, fn: layoutToggleBtnFunction },
  { type: 'click', thing: planarToggleBtn, fn: planarToggleBtnFunction },
  { type: 'click', thing: shortenAllInProofBtn, fn: shortenAllInProofBtnFunction },
  { type: 'click', thing: proofWidthRangeResetBtn, fn: proofWidthRangeResetBtnFunction },
  { type: 'click', thing: proofHeightRangeResetBtn, fn: proofHeightRangeResetBtnFunction },
  { type: 'click', thing: openOntology, fn: openOntologyFunction },
  { type: 'input', thing: maxLengthInput, fn: maxLengthInputFunction },
  { type: 'input', thing: minHorizontalCompactnessInput, fn: minHorizontalCompactnessInputFunction },
  { type: 'input', thing: maxHorizontalCompactnessInput, fn: maxHorizontalCompactnessInputFunction },
  { type: 'input', thing: proofWidthRange, fn: proofWidthRangeFunction },
  { type: 'input', thing: minVerticalCompactnessInput, fn: minVerticalCompactnessInputFunction },
  { type: 'input', thing: maxVerticalCompactnessInput, fn: maxVerticalCompactnessInputFunction },
  { type: 'input', thing: proofHeightRange, fn: proofHeightRangeFunction },
  { type: 'change', thing: shorteningMethodSelection, fn: shorteningMethodSelectionFunction },
  { type: 'change', thing: tooltipPositionSelection, fn: tooltipPositionSelectionFunction },
  { type: 'resize', thing: window, fn: windowFunction },
  { type: 'center-root', thing: document, fn: documentFunction },
];

const conf = {
  svgProof: undefined,
  svgProofRootLayer: undefined,
  BBox: undefined,
  SVGwidth: undefined,
  SVGheight: undefined,
  margin: undefined,
  proofWidth: undefined,
  proofHeight: undefined,
  proofFile: undefined,
  signatureFile: undefined,
  ruleExplanationPosition: undefined,
  
  isDrawing: false,
  drawTime: 750,
  
  shortenAllInProof: false,
  allowOverlap: false,
  
  isMagic: false,
  isRuleShort: false,
  isLinear: false,

  tree: new TreeNavigation(),
  linear: new LinearNavigation(),
  magic: new MagicNavigation(),

  nodeVisuals: new NodeVisualsHelper(),
  rules: new RulesHelper(),
  axioms: new AxiomsHelper(),

  update: function (drawTime) {
    proof.tree.update(drawTime);
  }
}

function init_proof(proof_file_param) {
  if (proof.svgProofRootLayer) {
    proof.svgProofRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  if (!proof.svgProof) {
    proof.svgProof = d3.select("#proof-view");
    proof.BBox = proof.svgProof.node().getBoundingClientRect();
    proof.SVGwidth = proof.BBox.width;
    proof.SVGheight = proof.BBox.height;
    proof.margin = { top: 50, right: 50, bottom: 100, left: 50 };
    proof.proofWidth = proof.SVGwidth - proof.margin.left - proof.margin.right;
    proof.proofHeight = proof.SVGheight - proof.margin.top - proof.margin.bottom;
    proof.svgProof
      .attr("viewBox", [
        -proof.margin.left,
        -proof.margin.top,
        proof.SVGwidth,
        proof.SVGheight,
      ])
      .style("user-select", "none");
    proof.svgProofRootLayer = proof.svgProof.append('g').attr("id", "pViewport");
  }

  if (proof_file_param) {
    proof.proofFile = {
      name: proof_file_param,
    };
  }

  // Configure Socket IO
  let socket = io();
  socket.on("highlight axioms", (data) => {
    console.log("proof received the following ");
    console.log(data);
  });

  proof.axioms.socket = socket;
  
  // configure the html 
  allowOverlapBtn.checked = false;
  overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
  shorteningRuleNamesBtn.checked = false;

  proof.isMagic = false;
  proof.magic.currentMagicAction = "";
  magicToggleBtn.checked = false;
  layoutToggleBtn.checked = false;
  planarToggleBtn.checked = true;
  planarToggleBtn.closest(".planar-div-wrapper").style.display = "none";
  
  shorteningMethodSelection.value = globals.shorteningMethod;
  maxLengthInput.closest(".input-range-wrapper").style.display = "none";

  updateShorteningButton(original, shortenAllInProofBtn);

  //update the selection of the tooltip position
  proof.ruleExplanationPosition = "leftBottom";
  tooltipPositionSelection.value = proof.ruleExplanationPosition;

  //Update the width of the proof
  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * proof.proofWidth);
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * proof.proofWidth);
  proofWidthRange.value = fixDecimals(proof.proofWidth);

  //Update the height of the proof
  proof.proofHeight = proof.proofHeight;

  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * proof.proofHeight);
  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * proof.proofHeight);
  proofHeightRange.value = fixDecimals(proof.proofHeight);

  // set listeners
  thingsWithListeners.forEach(twl => {
    twl.thing.removeEventListener(twl.type, twl.fn);
    twl.thing.addEventListener(twl.type, twl.fn);
  })

  proof.svgProof
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", [0, 0, 20, 20])
    .attr("refX", 27)
    .attr("refY", 10)
    .attr("markerWidth", 8)
    .attr("markerHeight", 8)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", d3.line()([[0, 0],[0, 20],[20, 10]]))
    .attr("fill", "darkgrey");

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    createContent(xml);
    proof.minimap = thumbnailViewer({ mainViewId: "proof-view", containerSelector: "#proof-container" });
  });
}

function createContent(data) {
  // Generate nodes and edges from the raw data
  let processedData = processData(data);
  proof.tree.init(processedData);
}

function getFileName() {
  let fileName = "proof";
  if (proof.proofFile) {
    fileName = proof.proofFile.name;
  } else {
    proof.proofFile = {
      name: fileName
    };
  }

  fileName = fileName.indexOf(".ht.xml") !== -1 ?
    fileName.substring(0, fileName.indexOf(".ht.xml")) :
    fileName.indexOf(".t.xml") !== -1 ?
      fileName.substring(0, fileName.indexOf(".t.xml")) : fileName;

  if (proof.isLinear) {
    fileName += ".ht.xml";
  } else {
    fileName += ".t.xml";
  }
  return fileName;
}

function updateShorteningButton(original, shortenAllInProofBtn) {
  if (!original) {
    proof.shortenAllInProof = true;
    shortenAllInProofBtn.textContent = "Undo shortening";
    shortenAllInProofBtn.title = "Undo shortening effect in the proof";
  } else {
    proof.shortenAllInProof = false;
    shortenAllInProofBtn.textContent = "Shorten all";
    shortenAllInProofBtn.title = "Shorten all text in the proof";
  }
}

function loadProof(event) {
  proof.proofFile = event.target.files[0];
  proof.nodeVisuals.initVarsAxiomFunctions();

  upload(proof.proofFile, _ => {
    d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
      proof.svgProofRootLayer.selectAll("*").remove();
      createContent(xml);
    });
  });
}

function loadSignature(event) {
  proof.signatureFile = event.target.files[0];
  upload(proof.signatureFile);
}

function allowOverlapBtnFunction() {
  proof.allowOverlap = allowOverlapBtn.checked;
  overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
  proof.update();
}

function collapseAllBtnFunction() {
  // disable magic mode
  magicToggleBtn.checked = false;
  proof.isMagic = false;
  proof.magic.currentMagicAction = "";
  proof.tree.resetHierarchy();
  proof.axioms.showConclusionOnly();
}

function shorteningRuleNamesBtnFunction() {
  proof.isRuleShort = shorteningRuleNamesBtn.checked;
}

function magicToggleBtnFunction() {
  // Clear the SVG content
  proof.svgProofRootLayer.selectAll("*").remove();
  if (magicToggleBtn.checked) {
    layoutToggleBtn.checked = false;
    proof.isLinear = false;
  }
  proof.isMagic = magicToggleBtn.checked;
  if (!proof.isMagic) {
    proof.magic.currentMagicAction = undefined;
  }

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    proof.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function layoutToggleBtnFunction() {
  // Clear the SVG content
  proof.svgProofRootLayer.selectAll("*").remove();

  if (layoutToggleBtn.checked) {
    magicToggleBtn.checked = false;
    proof.isMagic = false;
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "block"
  } else {
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "none"
  }
  proof.isLinear = layoutToggleBtn.checked;

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    proof.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function planarToggleBtnFunction() {
  proof.linear.isDistancePriority = planarToggleBtn.checked;
  proof.update();
}

function shortenAllInProofBtnFunction() {
  original = !original;
  let nodeID;
  let nodesClass = proof.isRuleShort ? ".axiom,.rule" : ".axiom";
  //Update shortening button
  updateShorteningButton(original, shortenAllInProofBtn);

  if (original) {
    //Restore all to original
    nodesClass = ".axiom,.rule";
  }

  //Handle rules
  if (!nodesClass.includes("rule") && !nodesClass.includes("CDRule") && !nodesClass.includes("DLRule")) {
    d3.selectAll(".rule").filter(d => d).each(d => {
      nodeID = "N" + d.data.source.id;
      proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "original");
      proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "original");
    });
  }

  //Record the shortening
  d3.selectAll(nodesClass).filter(d => d).each(d => {
    nodeID = "N" + d.data.source.id;
    if (!original && proof.nodeVisuals.nodesDisplayFormat.get(nodeID) !== "textual") {
      proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "shortened");
      proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "shortened");
    } else if (proof.nodeVisuals.nodesDisplayFormat.get(nodeID) !== "textual") {
      proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "original");
      proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "original");
    }
  });

  //Redraw
  proof.update();
}

function proofWidthRangeResetBtnFunction() {
  proof.proofWidth = proof.proofWidth;
  proofWidthRange.value = proof.proofWidth;
  proof.update();
}

function proofHeightRangeResetBtnFunction() {
  proof.proofHeight = proof.proofHeight;
  proofHeightRange.value = proof.proofHeight;
  proof.update();
}

function maxLengthInputFunction() {
  if (globals.labelsShorteningHelper) {
    globals.labelsShorteningHelper.applyShortening(globals.shorteningMethod);
    proof.update();
  }
}

function minHorizontalCompactnessInputFunction() {
  const clampedMin =
    minHorizontalCompactnessInput.value * proof.proofWidth >
    proofWidthRange.value;
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * proof.proofWidth);

  if (clampedMin) {
    proofWidthRange.value = proofWidthRange.min;
    proof.proofWidth = proofWidthRange.min;
    proof.update();
  }
}

function maxHorizontalCompactnessInputFunction() {
  const clampedMax =
    maxHorizontalCompactnessInput.value * proof.proofWidth <
    proofWidthRange.value;
  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * proof.proofWidth);

  if (clampedMax) {
    proofWidthRange.value = proofWidthRange.max;
    proof.proofWidth = proofWidthRange.max;
    proof.update();
  }
}

function proofWidthRangeFunction() {
  proof.proofWidth = proofWidthRange.value;
  proof.update();
}

function minVerticalCompactnessInputFunction() {
  const clampedMin =
    minVerticalCompactnessInput.value * proof.proofHeight >
    proofHeightRange.value;
  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * proof.proofHeight);

  if (clampedMin) {
    proofHeightRange.value = proofHeightRange.min;
    proof.proofHeight = proofHeightRange.min;
    proof.update();
  }
}

function maxVerticalCompactnessInputFunction() {
  const clampedMax =
    maxVerticalCompactnessInput.value * proof.proofHeight <
    proofHeightRange.value;

  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * proof.proofHeight);
  if (clampedMax) {
    proofHeightRange.value = proofHeightRange.max;
    proof.proofHeight = proofHeightRange.max;
    proof.update();
  }
}

function proofHeightRangeFunction() {
  proof.proofHeight = proofHeightRange.value;
  proof.update();
}

function openOntologyFunction() {
  window.open('/ontology?id=' + getSessionId())
}

function shorteningMethodSelectionFunction() {
  maxLengthInput.closest(".input-range-wrapper").style.display = shorteningMethodSelection.value === "basic" ? "block" : "none";

  globals.shorteningMethod = shorteningMethodSelection.value;
  proof.update();
}

function tooltipPositionSelectionFunction() {
  proof.ruleExplanationPosition = tooltipPositionSelection.value;
  proof.update();
}

function windowFunction() {
  proof.update();
}

function documentFunction() {
  if (proof.minimap) {
    if (!proof.allowOverlap) {
      proof.minimap.main.pan({ x: proof.proofWidth / 2, y: 0 });
    } else {
      proof.minimap.main.pan({ x: 0, y: 50 });
    }
  }
}

export { init_proof, loadProof, loadSignature, conf as proof }