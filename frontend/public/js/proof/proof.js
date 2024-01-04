import { APP_GLOBALS as app, SharedData } from "../shared-data.js";
import { AxiomFunctionsHelper } from "./axiomFunctions.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import { processData, processDataLinear } from "./data/process-data.js";
import { upload } from '../utils/upload-file.js';

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
const navigationToggleBtn = document.getElementById("toggleNavMode");
const magicToggleBtn = document.getElementById("toggleMagicMode");
const layoutToggleBtn = document.getElementById("toggleLayoutMode");
const shorteningRuleNamesBtn = document.getElementById("toggleRuleNamesShortening");
const planarToggleBtn = document.getElementById("togglePlanar");
const overlapAllowingSettings = document.getElementById("proof-overlap-allowing-settings");

//Buttons
const shortenAllInProofBtn = document.getElementById("shortenAllInProofBtn");
const proofWidthRangeResetBtn = document.getElementById("proofWidthRangeReset");
const proofHeightRangeResetBtn = document.getElementById("proofHeightRangeReset");

//Mapping elements with click event to their function
const thingsWithListeners = [
  { type: 'click', thing: allowOverlapBtn, fn: allowOverlapBtnFunction },
  { type: 'click', thing: navigationToggleBtn, fn: navigationToggleBtnFunction },
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
  isMagic: false,
  isRuleShort: false,
  proofFile: undefined,
  signatureFile: undefined,
  ruleExplanationPosition: undefined,
  isDrawing: false,
  drawTime: 750,
  shortenAllInProof: false,
  isLinear: false,
  isDistancePriority: true,
}

function init_proof(proof_file_param) {
  if (conf.svgProofRootLayer) {
    conf.svgProofRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  if (!conf.svgProof) {
    conf.svgProof = d3.select("#proof-view");
    conf.BBox = conf.svgProof.node().getBoundingClientRect();
    conf.SVGwidth = conf.BBox.width;
    conf.SVGheight = conf.BBox.height;
    conf.margin = { top: 50, right: 50, bottom: 100, left: 50 };
    conf.proofWidth = conf.SVGwidth - conf.margin.left - conf.margin.right;
    conf.proofHeight = conf.SVGheight - conf.margin.top - conf.margin.bottom;
    conf.svgProof
      .attr("viewBox", [
        -conf.margin.left,
        -conf.margin.top,
        conf.SVGwidth,
        conf.SVGheight,
      ])
      .style("user-select", "none");
    conf.svgProofRootLayer = conf.svgProof.append('g').attr("id", "pViewport");
  }

  if (proof_file_param) {
    conf.proofFile = {
      name: proof_file_param,
    };
  }

  // Configure Socket IO
  let socket = io();
  socket.on("highlight axioms", (data) => {
    console.log("proof received the following ");
    console.log(data);
  });

  // Configure Shared Data // TODO: this should not happen here, because the AD by itself never loads this js! 
  SharedData.axiomFunctionsHelper = new AxiomFunctionsHelper(socket);
  
  // configure the html 
  allowOverlapBtn.checked = false;
  overlapAllowingSettings.style.display = SharedData.allowOverlap ? "block" : "none";
  navigationToggleBtn.checked = false;
  shorteningRuleNamesBtn.checked = false;

  conf.isMagic = false;
  SharedData.currentMagicAction = "";
  magicToggleBtn.checked = false;
  layoutToggleBtn.checked = false;
  planarToggleBtn.checked = true;
  planarToggleBtn.closest(".planar-div-wrapper").style.display = "none";
  
  shorteningMethodSelection.value = app.shorteningMethod;
  maxLengthInput.closest(".input-range-wrapper").style.display = "none";

  updateShorteningButton(original, shortenAllInProofBtn);

  //update the selection of the tooltip position
  conf.ruleExplanationPosition = "leftBottom";
  tooltipPositionSelection.value = conf.ruleExplanationPosition;

  //Update the width of the proof
  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * conf.proofWidth);
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * conf.proofWidth);
  proofWidthRange.value = fixDecimals(conf.proofWidth);

  //Update the height of the proof
  conf.proofHeight = conf.proofHeight;

  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * conf.proofHeight);
  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * conf.proofHeight);
  proofHeightRange.value = fixDecimals(conf.proofHeight);

  // set listeners
  thingsWithListeners.forEach(twl => {
    twl.thing.removeEventListener(twl.type, twl.fn);
    twl.thing.addEventListener(twl.type, twl.fn);
  })

  conf.svgProof
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
    conf.minimap = thumbnailViewer({ mainViewId: "proof-view", containerSelector: "#proof-container" });
  });
}

function getInitialMagicalHierarchy(data) {
  let result = [];
  let magicBox = SharedData.magicNavigationHelper.getNewMagicBox();
  let fake = data.find((x) => x.id === "L-1");
  data
    .filter((x) => x.source.element === "Asserted Conclusion")
    .forEach((x) => {
      result.push(x);
      result.push(
        SharedData.magicNavigationHelper.getNewEdge(x.target, magicBox)
      );
    });
  result.push(
    SharedData.magicNavigationHelper.getNewEdge(magicBox, fake.source)
  );
  result.push(fake);
  return result;
}

function createContent(data) {
  // Generate nodes and edges from the raw data
  let processedData;
  if (conf.isLinear) {
    processedData = processDataLinear(data);
  } else {
    processedData = processData(data);
  }

  let nodeData = processedData.nodes;
  let edgeData = processedData.edges;

  // add a custom link from the root node to.. nothing (needed for the stratify function)
  // This ID is also used in linkFunctions.js
  edgeData.push({
    id: "L-1",
    // source: nodeData[0],
    source: nodeData.filter((x) => x.isRoot)[0],
    target: "",
  });
  //Store original data
  SharedData.edgeData = edgeData;

  // initialize hierarchy depending on the navigation mode
  SharedData.hierarchy = conf.isMagic
    ? SharedData.createHierarchy(getInitialMagicalHierarchy(edgeData))
    : SharedData.createHierarchy(edgeData);

  // update and draw the tree
  SharedData.updateHierarchyVars(SharedData.hierarchy);

  SharedData.links = conf.svgProofRootLayer
    .append("g")
    .attr("id", "links")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  SharedData.nodes = conf.svgProofRootLayer
    .append("g")
    .attr("id", "nodes");

  SharedData.labels = conf.svgProof.selectAll("#nodes");
  SharedData.advancedUpdate();
}

function getFileName() {
  let fileName = "proof";
  if (conf.proofFile) {
    fileName = conf.proofFile.name;
  } else {
    conf.proofFile = {
      name: fileName
    };
  }

  fileName = fileName.indexOf(".ht.xml") !== -1 ?
    fileName.substring(0, fileName.indexOf(".ht.xml")) :
    fileName.indexOf(".t.xml") !== -1 ?
      fileName.substring(0, fileName.indexOf(".t.xml")) : fileName;

  if (conf.isLinear) {
    fileName += ".ht.xml";
  } else {
    fileName += ".t.xml";
  }
  return fileName;
}

function updateShorteningButton(original, shortenAllInProofBtn) {
  if (!original) {
    conf.shortenAllInProof = true;
    shortenAllInProofBtn.textContent = "Undo shortening";
    shortenAllInProofBtn.title = "Undo shortening effect in the proof";
  } else {
    conf.shortenAllInProof = false;
    shortenAllInProofBtn.textContent = "Shorten all";
    shortenAllInProofBtn.title = "Shorten all text in the proof";
  }
}

function loadProof(event) {
  conf.proofFile = event.target.files[0];
  SharedData.nodeVisualsHelper.initVarsAxiomFunctions();
  // initVarsLinkFunctions();

  upload(conf.proofFile, result => {
    d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
      conf.svgProofRootLayer.selectAll("*").remove();
      createContent(xml);
    });
  });
}

function loadSignature(event) {
  conf.signatureFile = event.target.files[0];
  upload(conf.signatureFile);
}

function allowOverlapBtnFunction() {
  SharedData.allowOverlap = this.checked;
  overlapAllowingSettings.style.display = SharedData.allowOverlap ? "block" : "none";
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function navigationToggleBtnFunction() {
  if (this.checked) {
    // disable magic mode
    magicToggleBtn.checked = false;
    conf.isMagic = false;
    SharedData.currentMagicAction = "";
    SharedData.resetHierarchy();
    SharedData.axiomFunctionsHelper.showConclusionOnly();
  } else {
    SharedData.resetHierarchy();
  }
}

function shorteningRuleNamesBtnFunction() {
  conf.isRuleShort = this.checked;
}

function magicToggleBtnFunction() {
  // Clear the SVG content
  conf.svgProofRootLayer.selectAll("*").remove();
  if (this.checked) {
    navigationToggleBtn.checked = false;
    layoutToggleBtn.checked = false;
    conf.isLinear = false;
  }
  conf.isMagic = this.checked;
  if (!conf.isMagic) {
    SharedData.currentMagicAction = undefined;
  }

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    conf.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function layoutToggleBtnFunction() {

  // Clear the SVG content
  conf.svgProofRootLayer.selectAll("*").remove();
  navigationToggleBtn.checked = false;
  if (this.checked) {
    magicToggleBtn.checked = false;
    conf.isMagic = false;
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "block"
  }
  else {
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "none"
  }
  conf.isLinear = this.checked;

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    conf.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function planarToggleBtnFunction() {
  conf.isDistancePriority = this.checked;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function shortenAllInProofBtnFunction() {
  original = !original
  let nodeID

  let nodesClass = conf.isRuleShort ? ".axiom,.rule" : ".axiom";
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
      SharedData.nodesDisplayFormat.set(nodeID, "original");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "original");
    });
  }

  //Record the shortening
  d3.selectAll(nodesClass).filter(d => d).each(d => {
    nodeID = "N" + d.data.source.id;
    if (!original && SharedData.nodesDisplayFormat.get(nodeID) !== "textual") {
      SharedData.nodesDisplayFormat.set(nodeID, "shortened");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "shortened");
    } else if (SharedData.nodesDisplayFormat.get(nodeID) !== "textual") {
      SharedData.nodesDisplayFormat.set(nodeID, "original");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "original");
    }
  });

  //Redraw
  SharedData.advancedUpdate();
}

function proofWidthRangeResetBtnFunction() {
  conf.proofWidth = conf.proofWidth;
  proofWidthRange.value = conf.proofWidth;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function proofHeightRangeResetBtnFunction() {
  conf.proofHeight = conf.proofHeight;
  proofHeightRange.value = conf.proofHeight;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function maxLengthInputFunction() {
  if (SharedData.labelsShorteningHelper) {
    SharedData.labelsShorteningHelper.applyShortening(app.shorteningMethod);
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function minHorizontalCompactnessInputFunction() {
  const clampedMin =
    minHorizontalCompactnessInput.value * conf.proofWidth >
    proofWidthRange.value;
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * conf.proofWidth);

  if (clampedMin) {
    proofWidthRange.value = proofWidthRange.min;
    conf.proofWidth = proofWidthRange.min;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function maxHorizontalCompactnessInputFunction() {
  const clampedMax =
    maxHorizontalCompactnessInput.value * conf.proofWidth <
    proofWidthRange.value;
  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * conf.proofWidth);

  if (clampedMax) {
    proofWidthRange.value = proofWidthRange.max;
    conf.proofWidth = proofWidthRange.max;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function proofWidthRangeFunction() {
  conf.proofWidth = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function minVerticalCompactnessInputFunction() {
  const clampedMin =
    minVerticalCompactnessInput.value * conf.proofHeight >
    proofHeightRange.value;
  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * conf.proofHeight);

  if (clampedMin) {
    proofHeightRange.value = proofHeightRange.min;
    conf.proofHeight = proofHeightRange.min;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function maxVerticalCompactnessInputFunction() {
  const clampedMax =
    maxVerticalCompactnessInput.value * conf.proofHeight <
    proofHeightRange.value;

  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * conf.proofHeight);
  if (clampedMax) {
    proofHeightRange.value = proofHeightRange.max;
    conf.proofHeight = proofHeightRange.max;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function proofHeightRangeFunction() {
  conf.proofHeight = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function openOntologyFunction() {
  window.open('/ontology?id=' + getSessionId())
}

function shorteningMethodSelectionFunction() {
  maxLengthInput.closest(".input-range-wrapper").style.display = this.value === "basic" ? "block" : "none";

  app.shorteningMethod = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function tooltipPositionSelectionFunction() {
  conf.ruleExplanationPosition = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function windowFunction() {
  SharedData.advancedUpdate();
}

function documentFunction() {
  if (conf.minimap) {
    if (!SharedData.allowOverlap) {
      conf.minimap.main.pan({ x: conf.proofWidth / 2, y: 0 });
    } else {
      conf.minimap.main.pan({ x: 0, y: 50 });
    }
  }
}

export { init_proof, loadProof, loadSignature, conf }