import thumbnailViewer from "../utils/pan-zoom.js";
import { getTreeFromXML, getTreeFromJSON } from "./data/process-data.js";
import { upload } from '../utils/upload-file.js';

import { AxiomsHelper } from "./axioms.js";
import { RulesHelper } from "./rules/rules.js";
import { NodeVisualsHelper } from "./node-visuals.js";

import { TreeNavigation } from "./trees/tree.js";
import { LinearNavigation } from "./trees/linear.js";
import { MagicNavigation } from "./trees/magic.js";

import { controls, init as initControls } from "./controls.js";
import { proof } from "./proof.js";
import { globals } from "../shared-data.js";

const conf = {
  div: "proof-container",
  shortenAll: false,
  allowOverlap: false,
  showRules: false,
  isMagic: false,
  isRuleShort: false,
  isLinear: false,
  drawTime: 750,

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

  load: function (path) {
    const file = path ? path : "../data/" + getSessionId() + "/" + getFileName();

    if (file.endsWith(".t.xml")) {
      d3.xml(file).then(xml => {
        proof.tree.init(getTreeFromXML(xml));
      });
    }

    if (file.endsWith(".json")) {
      d3.json(file).then(json => {
        proof.tree.init(getTreeFromJSON(json));
      });
    }
  },

  update: function (reset) {
    proof.tree.update(reset);
  }
}

function init_proof({
  file,
  external,
}) {
  if (external) {
    proof.div = external.div || proof.div,
    proof.isMagic = external.isMagic || proof.isMagic; 
    proof.isLinear = external.isLinear || proof.isLinear; 

    globals.shorteningMethod = external.shorteningMethod || globals.shorteningMethod;
    proof.shortenAll = external.shortenAll || proof.shortenAll; 
    proof.isRuleShort = external.isRuleShort || proof.isRuleShort;

    proof.allowOverlap = external.allowOverlap || proof.allowOverlap; 
    proof.drawTime = external.drawTime || proof.drawTime; 
  }

  if (proof.svgRootLayer) {
    proof.svgRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  if (!proof.svg) {
    d3.select(`#${proof.div}`).insert("svg", ":first-child").attr("id", "proof-view"); 
    proof.svg = d3.select("#proof-view");

    proof.BBox = proof.svg.node().getBoundingClientRect();
    proof.SVGwidth = proof.BBox.width;
    proof.SVGheight = proof.BBox.height;
    proof.margin = { top: 50, right: 50, bottom: 100, left: 50 };
    proof.width = proof.SVGwidth - proof.margin.left - proof.margin.right;
    proof.height = proof.SVGheight - proof.margin.top - proof.margin.bottom;
    proof.svg
      .attr("viewBox", [
        -proof.margin.left,
        -proof.margin.top,
        proof.SVGwidth,
        proof.SVGheight,
      ])
      .style("user-select", "none");
    proof.svgRootLayer = proof.svg.append('g').attr("id", "pViewport");
  }

  if (file) {
    proof.proofFile = { name: file };
  }

  // Configure Socket IO
  let socket = io();
  socket.on("highlight axioms", (data) => {
    console.log("proof received the following ");
    console.log(data);
  });

  proof.axioms.socket = socket;
  proof.magic.currentMagicAction = "";

  initControls();

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
  
  proof.minimap = thumbnailViewer({ mainViewId: "proof-view", containerSelector: `#${proof.div}` });
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

  fileName += ".t.xml";
  return fileName;
}

function loadProof(event) {
  proof.proofFile = event.target.files[0];
  proof.nodeVisuals.initVarsAxiomFunctions();

  upload(proof.proofFile, _ => {
    proof.load();
  });
}

function loadSignature(event) {
  proof.signatureFile = event.target.files[0];
  upload(proof.signatureFile);
}

export { init_proof, loadProof, loadSignature, conf as proof }