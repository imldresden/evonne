import thumbnailViewer from "../utils/pan-zoom.js";
import { getTreeFromXML, getTreeFromJSON } from "./data/process-data.js";
import { getProofFromJSONTrace } from "./data/process-trace.js";

import { AxiomsHelper } from "./axioms.js";
import { RulesHelper } from "./rules/rules.js";
import { NodeVisualsHelper } from "./node-visuals.js";

import { TreeNavigation } from "./trees/tree.js";
import { LinearNavigation } from "./trees/linear.js";
import { MagicNavigation } from "./trees/magic.js";

import { controls, init as initControls } from "./controls.js";
import { proof } from "./proof.js";
import { globals } from "../shared-data.js";
import { RuleNameMapHelper } from "./ruleNamesMapHelper.js";

const conf = {
  div: "proof-container",
  isZoomPan: true,
  shortenAll: false,
  allowOverlap: false,
  showRules: true,
  showSubProofs: false,
  showPopover: true,
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

    const url = new URL(window.location.toLocaleString()).searchParams;
    if (url.get("cond") === "sp") { // TODO remove this, and extra extract-examples in package.json
      proof.showSubProofs = true;
      proof.showPopover = false;
    }

    if (file.endsWith(".json")) {
      d3.json(file).then(json => {
        proof.tree.init(getTreeFromJSON(json));
      });
    } else {
      try { // file.endsWith(".t.xml"), or blob
        d3.xml(file).then(xml => {
          console.log(xml)
          proof.tree.init(getTreeFromXML(xml));
        });
      } catch (e) {
        console.error(e)
      }
    }
  },

  load_trace: function (trace) {
    proof.trace = trace.payload;
    proof.tree.init(getProofFromJSONTrace(trace));
    proof.printType2Query = function () {
      console.log(proof.trace)
    }
  },

  update: function ({ reset=false, ext=undefined } = {}) {
    ext && setFromExternal(ext);
    proof.tree.update(reset);
  }
}

function setDefinedProperty(srcObj, targetObj, prop) {
  // explicitly write undefined to avoid confusion with truthy values (e.g. false flag)
  if (srcObj[prop] !== undefined) { 
    targetObj[prop] = srcObj[prop];
  }
}

function setFromExternal(external) {
  proof.div = external.div || proof.div,
  [
    'div',
    'isZoomPan',
    'isMagic',
    'isLinear',
    'isCompact',
    'compactInteraction',
    'showRules',
    'showSubProofs',
    'shortenAll', 
    'isRuleShort', 
    'allowOverlap',
    'trays',
    'stepNavigator',
    'drawTime',
  ].map(prop => setDefinedProperty(external, proof, prop));

  [
    'isBreadthFirst',
    'bottomRoot',
  ].map(prop => setDefinedProperty(external, proof.linear, prop));
  
  globals.shorteningMethod = external.shorteningMethod || globals.shorteningMethod;
}

function addArrowheads(svg) {
  svg
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
}

function init_trace(params = {}) {

  
  setFromExternal(params);
  d3.select(`#${proof.div}`).selectAll("*").remove()

  if (proof.svgRootLayer) {
    proof.svgRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  d3.select(`#${proof.div}`).html(`<svg id="proof-view" style="flex:1"> </svg>`).style("display", "flex");

  proof.svg = d3.select("#proof-view");
  proof.BBox = proof.svg.node().getBoundingClientRect();
  proof.SVGwidth = proof.BBox.width;
  proof.SVGheight = proof.BBox.height;
  proof.margin = { top: 50, right: 50, bottom: 100, left: 50 };
  proof.width = proof.SVGwidth - proof.margin.left - proof.margin.right;
  proof.height = proof.SVGheight - proof.margin.top - proof.margin.bottom;
  proof.svg.style("user-select", "none");
  proof.svgRootLayer = proof.svg.append('g').attr("id", "pViewport").attr("transform", "translate(0, 10)");
  addArrowheads(proof.svg);

  proof.load_trace(params.trace);
  
  if (params.isZoomPan) {
    svgPanZoom("#proof-view", {
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: false,
      center: false,
      minZoom: 0.1,
      dblClickZoomEnabled: false,
    });  
  }
  
  return proof;
}

function init_proof({
  file,
  ruleNamesMap,
  external,
} = {}) {
  //Set a ruleNameMap to be used to replace the labels of rule nodes
  ruleNamesMap && conf.ruleNameMapHelper.setRuleNamesMaps(ruleNamesMap)

  if (external) {
    d3.select(`#${proof.div}`).selectAll("*").remove();
    setFromExternal(external);
  }

  if (proof.svgRootLayer) {
    proof.svgRootLayer.selectAll("*").remove();
  }

  // Configure SVG
  d3.select(`#${proof.div}`).html(`
    <div class="minimap-view-container opacity-0">
      <svg class="minimap scope-container">
        <g>
          <rect class="scope" x="199.99999857761642" y="157.9999943659637" width="41.10526272763356" height="37.59999960472709"></rect>
        </g>
      </svg>
      <embed type="image/svg+xml" class="minimap minimap-view">
    </div>
  `)

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

  // TODO-REMOVE: Specific to benchmark
  if (proof.proofFile?.name === `out_${new URL(window.location.toLocaleString()).searchParams.get("id")}_graphML0.t.xml`) {
    console.log(`PROOF ${proof.proofFile.name} BENCHMARK:`)
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
  
  addArrowheads(proof.svg);

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

export { init_proof, init_trace, conf as proof }
