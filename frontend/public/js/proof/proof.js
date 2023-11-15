import { APP_GLOBALS as app, SharedData, removeListeners } from "../shared-data.js";
import { AxiomFunctionsHelper } from "./axiomFunctions.js";
import { LinkFunctionsHelper } from "./linkFunctions.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import * as lP from "./linearProof/linearProofHelper.js";
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
const shorteningMethodSelection = document.getElementById(app.shorteningVarName);
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
const thingsWithClickListeners = new Map();
thingsWithClickListeners.set(allowOverlapBtn,allowOverlapBtnFunction);
thingsWithClickListeners.set(navigationToggleBtn,navigationToggleBtnFunction);
thingsWithClickListeners.set(shorteningRuleNamesBtn,shorteningRuleNamesBtnFunction);
thingsWithClickListeners.set(magicToggleBtn,magicToggleBtnFunction);
thingsWithClickListeners.set(layoutToggleBtn,layoutToggleBtnFunction);
thingsWithClickListeners.set(planarToggleBtn,planarToggleBtnFunction);
thingsWithClickListeners.set(shortenAllInProofBtn,shortenAllInProofBtnFunction);
thingsWithClickListeners.set(proofWidthRangeResetBtn,proofWidthRangeResetBtnFunction);
thingsWithClickListeners.set(proofHeightRangeResetBtn,proofHeightRangeResetBtnFunction);
thingsWithClickListeners.set(openOntology,openOntologyFunction);

//Mapping elements with input event to their functions
const thingsWithInputListeners = new Map();
thingsWithInputListeners.set(maxLengthInput,maxLengthInputFunction);
thingsWithInputListeners.set(minHorizontalCompactnessInput,minHorizontalCompactnessInputFunction);
thingsWithInputListeners.set(maxHorizontalCompactnessInput,maxHorizontalCompactnessInputFunction);
thingsWithInputListeners.set(proofWidthRange,proofWidthRangeFunction);
thingsWithInputListeners.set(minVerticalCompactnessInput,minVerticalCompactnessInputFunction);
thingsWithInputListeners.set(maxVerticalCompactnessInput,maxVerticalCompactnessInputFunction);
thingsWithInputListeners.set(proofHeightRange,proofHeightRangeFunction);

//Mapping elements with change event to their functions
const thingsWithChangeListeners = new Map();
thingsWithChangeListeners.set(shorteningMethodSelection,shorteningMethodSelectionFunction);
thingsWithChangeListeners.set(tooltipPositionSelection,tooltipPositionSelectionFunction);

//Mapping elements with resize event to their functions
const thingsWithResizeListeners = new Map();
thingsWithResizeListeners.set(window,windowFunction);

//Mapping elements with center-root event to their functions
const thingsWithCenterRootListeners = new Map();
thingsWithCenterRootListeners.set(document,documentFunction);

export function init_proof(proof_file_param) {
  // Configure SVG
  if(!app.svgProof){
    app.svgProof = d3.select("#proof-view");
    app.BBox = app.svgProof.node().getBoundingClientRect();
    app.SVGwidth = app.BBox.width;
    app.SVGheight = app.BBox.height;
    app.margin = { top: 50, right: 50, bottom: 100, left: 50 };
    app.contentWidth = app.SVGwidth - app.margin.left - app.margin.right;
    app.contentHeight = app.SVGheight - app.margin.top - app.margin.bottom;
    app.svgProof
      .attr("viewBox", [
        -app.margin.left,
        -app.margin.top,
        app.SVGwidth,
        app.SVGheight,
      ])
      .style("user-select", "none");
    app.svgProofRootLayer = app.svgProof.append('g').attr("id","pViewport");
  }

  if (proof_file_param) {
    app.proofFile = {
      name : proof_file_param,
    };
  }
  //TODO this should be uncommented after the study
  //app.drawTime = app.isDebug ? 3000 : app.drawTime;

  // Configure Socket IO
  let socket = io();
  socket.on("highlight axioms", (data) => {
    console.log("proof received the following ");
    console.log(data);
  });

  // Configure Shared Data // TODO: this should not happen here, because the AD by itself never loads this js! 
  SharedData.axiomFunctionsHelper = new AxiomFunctionsHelper(socket);
  SharedData.linkFunctionsHelper = new LinkFunctionsHelper();

  //Remove listeners of types
  removeListeners("click",thingsWithClickListeners);
  removeListeners("input",thingsWithInputListeners);
  removeListeners("change",thingsWithChangeListeners);
  removeListeners("resize",thingsWithResizeListeners);
  removeListeners("center-root",thingsWithCenterRootListeners);

  if (allowOverlapBtn) {
    allowOverlapBtn.checked = false;
    allowOverlapBtn.addEventListener("click", allowOverlapBtnFunction);
  }
  overlapAllowingSettings.style.display = SharedData.allowOverlap ? "block" : "none";

  // Configure Navigation Mode
  // -- Switch on to explore step-wise
  if (navigationToggleBtn) {
    navigationToggleBtn.checked = false;
    navigationToggleBtn.addEventListener("click", navigationToggleBtnFunction);
  }

  // Configure shortening of rule names
  if (shorteningRuleNamesBtn) {
    shorteningRuleNamesBtn.checked = false;
    shorteningRuleNamesBtn.addEventListener("click", shorteningRuleNamesBtnFunction);
  }

  // Configure Magic Mode
  app.isMagic = false;
  SharedData.currentMagicAction = "";
  if (magicToggleBtn) {
    magicToggleBtn.checked = false;
    magicToggleBtn.addEventListener("click", magicToggleBtnFunction);
  }

  // Configure Layout Mode
  // -- Switch on to explore step-wise
  if (layoutToggleBtn) {
    layoutToggleBtn.checked = false;
      layoutToggleBtn.addEventListener("click", layoutToggleBtnFunction);
  }

  // Configure planar (optimise premise distance) property of the linear layout mode
  if (planarToggleBtn) {
    planarToggleBtn.checked = true;
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "none"
    planarToggleBtn.addEventListener("click", planarToggleBtnFunction);
  }

  //update the selection of the shortening method
  shorteningMethodSelection.value = app.shorteningMethod;
  

  maxLengthInput.closest(".input-range-wrapper").style.display = "none";
  maxLengthInput.addEventListener("input", maxLengthInputFunction);

  updateShorteningButton(original, shortenAllInProofBtn);

  shortenAllInProofBtn.addEventListener("click", shortenAllInProofBtnFunction);
  shorteningMethodSelection.addEventListener("change", shorteningMethodSelectionFunction);

  //update the selection of the tooltip position
  app.ruleExplanationPosition = "leftBottom";
  tooltipPositionSelection.value = app.ruleExplanationPosition;
  tooltipPositionSelection.addEventListener("change", tooltipPositionSelectionFunction);
  //Update the width of the proof
  app.proofWidth = app.contentWidth;

  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * app.contentWidth);
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * app.contentWidth);
  proofWidthRange.value = fixDecimals(app.contentWidth);

  minHorizontalCompactnessInput.addEventListener("input", minHorizontalCompactnessInputFunction);
  maxHorizontalCompactnessInput.addEventListener("input", maxHorizontalCompactnessInputFunction);

    proofWidthRangeResetBtn.addEventListener("click", proofWidthRangeResetBtnFunction);

    proofWidthRange.addEventListener("input", proofWidthRangeFunction);

  //Update the height of the proof
  app.proofHeight = app.contentHeight;

  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * app.contentHeight);
  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * app.contentHeight);
  proofHeightRange.value = fixDecimals(app.contentHeight);

  minVerticalCompactnessInput.addEventListener("input", minVerticalCompactnessInputFunction);
  maxVerticalCompactnessInput.addEventListener("input", maxVerticalCompactnessInputFunction);

  proofHeightRangeResetBtn.addEventListener("click", proofHeightRangeResetBtnFunction);
  proofHeightRange.addEventListener("input", proofHeightRangeFunction);

  openOntology.addEventListener('click', openOntologyFunction);

  // Configure Windows resizing
  window.addEventListener("resize", windowFunction);

  // define arrowheads
  let arrowPoints = [
    [0, 0],
    [0, 20],
    [20, 10],
  ];
  app.svgProof
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
    .attr("d", d3.line()(arrowPoints))
    .attr("fill", "darkgrey");

  // DEBUG: Read data at the beginning to avoid having to manually load data
  // d3.xml("../data/iceNCheeseIsBot_subPizza.xml").then(xml => {
  if (app.isDebug) {
    d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
      createContent(xml);
      app.minimap = thumbnailViewer({ mainViewId: "proof-view", containerSelector: "#proof-container" });
    });
  }
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
  if (app.isLinear) processedData = lP.processData(data);
  else processedData = processData(data);
  let nodeData = processedData.nodes;
  let edgeData = processedData.edges;
  let originalEdgeData = edgeData;

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
  SharedData.hierarchy = app.isMagic
    ? SharedData.createHierarchy(getInitialMagicalHierarchy(edgeData))
    : SharedData.createHierarchy(edgeData);

  // update and draw the tree
  SharedData.updateHierarchyVars(SharedData.hierarchy);

  SharedData.links = app.svgProofRootLayer
    .append("g")
    .attr("id", "links")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  SharedData.nodes = app.svgProofRootLayer
    .append("g")
    .attr("id", "nodes");

  SharedData.labels = app.svgProof.selectAll("#nodes");

  SharedData.advancedUpdate();
}

function processData(data) {
  // Compute edges
  let edgeData = [].map.call(data.querySelectorAll("edge"), (d) => {
    let edgeId = d.getAttribute("id");
    let edgeSource = d.getAttribute("source");
    let edgeTarget = d.getAttribute("target");

    return { id: edgeId, source: edgeSource, target: edgeTarget };
  });

  // Compute nodes
  let nodeData = [].map.call(data.querySelectorAll("node"), (d) => {
    let type, element, mselement, nlelement;

    let id = d.id;

    let dataNodes = d.querySelectorAll("data");

    dataNodes.forEach((item) => {
      const key = item.getAttribute("key");
      if (key === "type") {
        type = item.textContent;
      } else if (key === "element") {
        element = item.textContent;
      } else if (key === "mselement") {
        mselement = item.textContent;
      } else if (key === "nlelement") {
      nlelement = item.textContent;
    }
    });

    let outGoingEdges = edgeData.filter(function (edge) {
      return edge.source === id;
    });
    let isRoot = false;
    if (outGoingEdges.length === 0) isRoot = true;

    return { id, type, element, mselement, nlelement, isRoot };
  });

  // Add the nodeData to the edgeData
  edgeData.forEach((d) => {
    d.source = nodeData.find((b) => b.id === d.source);
    d.target = nodeData.find((b) => b.id === d.target);
  });

  return {
    nodes: nodeData,
    edges: edgeData,
  };
}

document.addEventListener("center-root", documentFunction);

function getFileName() {
  let fileName = "proof";
  if (app.proofFile) {
    fileName = app.proofFile.name;
  } else { 
    app.proofFile = {
      name : fileName
    };
  }

  fileName = fileName.indexOf(".ht.xml") !== -1 ? 
    fileName.substring(0, fileName.indexOf(".ht.xml")) : 
    fileName.indexOf(".t.xml") !== -1 ? 
    fileName.substring(0, fileName.indexOf(".t.xml")) : fileName;

  if (app.isLinear) {
    fileName += ".ht.xml";
  } else {
    fileName += ".t.xml";
  }
  return fileName;
}

function updateShorteningButton(original, shortenAllInProofBtn){
  if (!original){
    app.shortenAllInProof = true;
    shortenAllInProofBtn.textContent = "Undo shortening";
    shortenAllInProofBtn.title = "Undo shortening effect in the proof";
  }else{
    app.shortenAllInProof = false;
    shortenAllInProofBtn.textContent = "Shorten all";
    shortenAllInProofBtn.title = "Shorten all text in the proof";
  }
}

export function loadProof(event) {
  app.proofFile = event.target.files[0];
  SharedData.nodeVisualsHelper.initVarsAxiomFunctions();
  // initVarsLinkFunctions();
  
  upload(app.proofFile, result => {
    d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
      app.svgProofRootLayer.selectAll("*").remove();
      createContent(xml);
    });
  });
}

export function loadSignature(event) {
  app.signatureFile = event.target.files[0];
  upload(app.signatureFile);
}

function allowOverlapBtnFunction(){
    SharedData.allowOverlap = this.checked;
    overlapAllowingSettings.style.display = SharedData.allowOverlap ? "block" : "none";
    SharedData.advancedUpdate(SharedData.hierarchy);
}

function navigationToggleBtnFunction() {
  if (this.checked) {
    // disable magic mode
    magicToggleBtn.checked = false;
    app.isMagic = false;
    SharedData.currentMagicAction = "";
    SharedData.resetHierarchy();
    SharedData.axiomFunctionsHelper.showConclusionOnly();
  } else {
    SharedData.resetHierarchy();
  }
}

function shorteningRuleNamesBtnFunction() {
  app.isRuleShort = this.checked;
}

function magicToggleBtnFunction() {
  // Clear the SVG content
  app.svgProofRootLayer.selectAll("*").remove();
  if (this.checked) {
    navigationToggleBtn.checked = false;
    layoutToggleBtn.checked = false;
    app.isLinear = false;
  }
  app.isMagic = this.checked;
  if (!app.isMagic) {
    SharedData.currentMagicAction = undefined;
  }

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    app.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function layoutToggleBtnFunction() {

  // Clear the SVG content
  app.svgProofRootLayer.selectAll("*").remove();
  navigationToggleBtn.checked = false;
  if (this.checked) {
    magicToggleBtn.checked = false;
    app.isMagic = false;
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "block"
  }
  else
  {
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "none"
  }
  app.isLinear = this.checked;

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    app.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function planarToggleBtnFunction() {
  app.isDistancePriority = this.checked;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function shortenAllInProofBtnFunction(){
  original = !original
  let nodeID

  let nodesClass = app.isRuleShort ? ".axiom,.rule" : ".axiom";
  //Update shortening button
  updateShorteningButton(original, shortenAllInProofBtn);

  if (original){
    //Restore all to original
    nodesClass = ".axiom,.rule";
  }

  //Handle rules
  if (!nodesClass.includes("rule"))
    d3.selectAll(".rule").filter(d=>d).each(d=>{
      nodeID = "N"+d.data.source.id;
      SharedData.nodesDisplayFormat.set(nodeID, "original");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "original");
    });

  //Record the shortening
  d3.selectAll(nodesClass).filter(d=>d).each(d=>{
    nodeID = "N"+d.data.source.id;
    if (!original && SharedData.nodesDisplayFormat.get(nodeID) !== "textual") {
      SharedData.nodesDisplayFormat.set(nodeID, "shortened");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "shortened");
    }else if (SharedData.nodesDisplayFormat.get(nodeID) !== "textual"){
      SharedData.nodesDisplayFormat.set(nodeID, "original");
      SharedData.nodesCurrentDisplayFormat.set(nodeID, "original");
    }
  });

  //Redraw
  SharedData.advancedUpdate();
}
function proofWidthRangeResetBtnFunction(){
  app.proofWidth = app.contentWidth;
  proofWidthRange.value = app.proofWidth;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function proofHeightRangeResetBtnFunction() {
  app.proofHeight = app.contentHeight;
  proofHeightRange.value = app.proofHeight;
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
      minHorizontalCompactnessInput.value * app.contentWidth >
      proofWidthRange.value;
  proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * app.contentWidth);

  if (clampedMin) {
    proofWidthRange.value = proofWidthRange.min;
    app.proofWidth = proofWidthRange.min;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function maxHorizontalCompactnessInputFunction() {
  const clampedMax =
      maxHorizontalCompactnessInput.value * app.contentWidth <
      proofWidthRange.value;
  proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * app.contentWidth);

  if (clampedMax) {
    proofWidthRange.value = proofWidthRange.max;
    app.proofWidth = proofWidthRange.max;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function proofWidthRangeFunction() {
  app.proofWidth = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function minVerticalCompactnessInputFunction(){
  const clampedMin =
      minVerticalCompactnessInput.value * app.contentHeight >
      proofHeightRange.value;
  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * app.contentHeight);

  if (clampedMin) {
    proofHeightRange.value = proofHeightRange.min;
    app.proofHeight = proofHeightRange.min;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function maxVerticalCompactnessInputFunction(){
  const clampedMax =
      maxVerticalCompactnessInput.value * app.contentHeight <
      proofHeightRange.value;

  proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * app.contentHeight);
  if (clampedMax) {
    proofHeightRange.value = proofHeightRange.max;
    app.proofHeight = proofHeightRange.max;
    SharedData.advancedUpdate(SharedData.hierarchy);
  }
}

function proofHeightRangeFunction() {
  app.proofHeight = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function openOntologyFunction(){
  window.open('/ontology?id=' + getSessionId())
}

function shorteningMethodSelectionFunction () {
  maxLengthInput.closest(".input-range-wrapper").style.display = this.value === "basic" ? "block" : "none";

  app.shorteningMethod = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function tooltipPositionSelectionFunction() {
  app.ruleExplanationPosition = this.value;
  SharedData.advancedUpdate(SharedData.hierarchy);
}

function windowFunction(){
  SharedData.advancedUpdate();
}

function documentFunction(){
  if (app.minimap) {
    if (!SharedData.allowOverlap) {
      app.minimap.main.pan({ x: app.proofWidth/2, y: 0 });
    } else {
      app.minimap.main.pan({ x: 0, y: 50 });
    }
  }
}