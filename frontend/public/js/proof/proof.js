import thumbnailViewer from "../utils/pan-zoom.js";
import { getTreeFromXML, getTreeFromJSON } from "./data/process-data.js";

import { AxiomsHelper } from "./axioms.js";
import { RulesHelper } from "./rules/rules.js";
import { NodeVisualsHelper } from "./node-visuals.js";

import { TreeNavigation } from "./trees/tree.js";
import { LinearNavigation } from "./trees/linear.js";
import { MagicNavigation } from "./trees/magic.js";

import { controls, init as initControls } from "./controls.js";
import { proof } from "./proof.js";
import { globals } from "../shared-data.js";
import {RuleNameMapHelper} from "./ruleNamesMapHelper.js";

const conf = {
  div: "proof-container",
  isZoomPan: true,
  shortenAll: false,
  allowOverlap: false,
  showRules: true,
  showSubProofs: false,
  isMagic: false,
  isRuleShort: false,
  isLinear: false,
  bottomRoot: false,

  isCompact: false, 
  compactInteraction: false, 
  
  drawTime: 750,
  trays: {upper: false, lower: true},
  stepNavigator: true, 

  proofFile: undefined,
  signatureFile: undefined,
  
  svg: undefined,
  svgRootLayer: undefined,
  BBox: undefined,
  SVGwidth: undefined,
  SVGheight: undefined,
  margin: undefined,
  width: undefined,
  height: undefined,
  controls,

  ruleExplanationPosition: "leftBottom",

  isDrawing: false,
  nodeInteracted: undefined,

  tree: new TreeNavigation(),
  linear: new LinearNavigation(),
  magic: new MagicNavigation(),

  nodeVisuals: new NodeVisualsHelper(),
  rules: new RulesHelper(),
  axioms: new AxiomsHelper(),

  ruleNameMapHelper : new RuleNameMapHelper(),

  load: function (path) {
    const file = path ? path : "../data/" + getSessionId() + "/" + getFileName();

    if (file.endsWith(".json")) {
      d3.json(file).then(json => {
        proof.tree.init(getTreeFromJSON(json));
      });
    } else {
      try { // file.endsWith(".t.xml"), or blob
        d3.xml(file).then(xml => {
          proof.tree.init(getTreeFromXML(xml));
        });
      } catch (e) {
        console.error(e)
      }
    }
  },

  update: function ({ reset=false, ext=undefined } = {}) {
    ext && setFromExternal(ext);
    proof.tree.update(reset);
  }
}

function setFromExternal(external) {
  proof.div = external.div || proof.div,
  proof.isZoomPan = external.isZoomPan === undefined ? proof.isZoomPan : external.isZoomPan;

  proof.isMagic = external.isMagic === undefined ? proof.isMagic : external.isMagic; 
  
  proof.isLinear = external.isLinear  === undefined ? proof.isLinear : external.isLinear; 
  proof.linear.isBreadthFirst = external.isBreadthFirst === undefined ? proof.linear.isBreadthFirst : external.isBreadthFirst;
  proof.linear.bottomRoot = external.bottomRoot === undefined ? proof.linear.bottomRoot : external.bottomRoot;
  
  proof.isCompact = external.isCompact === undefined ? proof.isCompact : external.isCompact; 
  proof.compactInteraction = external.compactInteraction === undefined ? proof.compactInteraction : external.compactInteraction;

  proof.showRules = external.showRules === undefined ? proof.showRules : external.showRules;
  proof.showSubProofs = external.showSubProofs === undefined ? proof.showSubProofs : external.showSubProofs;

  globals.shorteningMethod = external.shorteningMethod || globals.shorteningMethod;
  proof.shortenAll = external.shortenAll === undefined ? proof.shortenAll : external.shortenAll; 
  proof.isRuleShort = external.isRuleShort === undefined ? proof.isRuleShort : external.isRuleShort;
  proof.allowOverlap = external.allowOverlap === undefined ? proof.allowOverlap : external.allowOverlap; 
  proof.trays = external.trays === undefined ? proof.trays : external.trays;
  proof.stepNavigator = external.stepNavigator === undefined ? proof.stepNavigator : external.stepNavigator;
  
  proof.drawTime = external.drawTime === undefined ? proof.drawTime : external.drawTime; 
}

function init_proof({
  file,
  ruleNamesMap,
  external,
} = {}) {
  //Set a ruleNameMap to be used to replace the labels of rule nodes
  conf.ruleNameMapHelper.setRuleNamesMaps(ruleNamesMap)

  //By default, hide the ontology view
  document.querySelectorAll('.resizer').forEach(function (element) {
    element.previousElementSibling.style.width = '99%'
  });

  d3.select(`#${proof.div}`).selectAll("*").remove();
  if (external) {
    setFromExternal(external);
  }

  if (proof.svgRootLayer) {
    proof.svgRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  d3.select(`#${proof.div}`).insert("svg", ":first-child").attr("id", "proof-view"); 
  proof.svg = d3.select("#proof-view");

  const svgNode = proof.svg.node();
  if (!proof.isZoomPan) {
    svgNode.parentElement.style.overflow= "auto";
    svgNode.parentElement.style.display= "block";
  } else {
    svgNode.style.flex = 1;
    svgNode.parentElement.style.display= "flex";
    svgNode.parentElement.style.overflow= "hidden";
  }

  proof.BBox = svgNode.getBoundingClientRect();
  proof.SVGwidth = proof.BBox.width;
  proof.SVGheight = proof.BBox.height;
  proof.margin = { top: 50, right: 50, bottom: 100, left: 50 };

  proof.width = proof.SVGwidth - proof.margin.left - proof.margin.right;
  proof.height = proof.SVGheight - proof.margin.top - proof.margin.bottom;

  if (proof.isZoomPan) {
    proof.svg
      .attr("viewBox", [
        -proof.margin.left,
        -proof.margin.top,
        proof.SVGwidth,
        proof.SVGheight,
      ])
  } 
  proof.svg.style("user-select", "none");
  proof.svgRootLayer = proof.svg.append('g').attr("id", "pViewport");

  if (file) {
    proof.proofFile = { name: file };
  }

  // Configure Socket IO
  let socket = io();
  socket.on("highlight axioms", (data) => {
    console.log("highlighting the following:");
    console.log(data);
  });

  proof.axioms.socket = socket;
  proof.magic.currentMagicAction = "";

  if (!external || (external && external.controls)) {
    initControls();
  }
  
  proof.svg
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
    .attr("d", d3.line()([[0, 0], [0, 20], [20, 10]]))
    .attr("fill", "darkgrey");

  if (external) {
    proof.load(external.path);
  } else {
    proof.load();
  }
  proof.minimap = thumbnailViewer({ mainViewId: "proof-view", containerSelector: `#${proof.div}`, isZoomPan : proof.isZoomPan });
}

function getFileName() {
  let fileName = "proof";
  if (proof.proofFile) {
    fileName = proof.proofFile.name;
  } else {
    proof.proofFile = { name: fileName };
  }

  return fileName;
}

export { init_proof, conf as proof }
