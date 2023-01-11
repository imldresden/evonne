import thumbnailViewer from "../utils/pan-zoom.js";
import { APP_GLOBALS as app, SharedData } from "../shared-data.js";
import { upload } from '../utils/upload-file.js';
import { progress } from '../main/main.js';
import {removeListeners} from "../proof/proof.js";
import {BasicSophisticatedShorteningFunctions} from "../shortening/sophisticatedBasic.js";

const BOX_PADDING = 20;
const socket = io();

let nodes, links;
let nodeData, edgeData;
let updateLabels = false;
let showSignature = true;
let wrapLines = false;
let newSim = true;
let ontologyFile = null;
let adOntologyFile = null;
let layoutFile = null;
let margin = null;
let contentWidth = null;
let contentHeight = null;
let showOriginal = null;

const ontologyNodeId = "oN";
const linkLengthFunctionInput = document.getElementById("linkLengthFunction");
const linkLengthIdealValue = document.getElementById("linkLengthIdealValue");
const linkLengthIdealValueReset = document.getElementById("linkLengthIdealValueReset");
const flowDirection = document.getElementById("flowDirection");
const flowStrength = document.getElementById("flowStrength");
const flowStrengthReset = document.getElementById("flowStrengthReset");
const maxLengthInput = document.getElementById("maximumLength");
const btnShowSignature = document.querySelector("#btnShowSignature");
const btnWrapLines = document.querySelector("#btnWrapLines");
const lineLengthInput = document.getElementById("lineLength");
const resetLayoutButton = document.getElementById("resetLayoutButton");
const saveLayoutButton = document.getElementById("saveLayoutButton");
const showRepairsMenuButton = document.getElementById("showRepairsMenuButton");
const shortenAllInOntologyBtn = document.getElementById("shortenAllInOntologyBtn");
const openProof = document.getElementById('openProofInNew');

const eventDrawEnd = new CustomEvent("drawend", { detail: { main: "ontology-view" } });

//Mapping elements with click event to their function
const thingsWithClickListeners = new Map();
thingsWithClickListeners.set(btnShowSignature,btnShowSignatureFunction);
thingsWithClickListeners.set(btnWrapLines,btnWrapLinesFunction);
thingsWithClickListeners.set(resetLayoutButton,resetLayout);
thingsWithClickListeners.set(saveLayoutButton,saveLayout);
thingsWithClickListeners.set(showRepairsMenuButton,showRepairsTab);
thingsWithClickListeners.set(linkLengthIdealValueReset,linkLengthIdealValueResetFunction);
thingsWithClickListeners.set(flowStrengthReset,flowStrengthResetFunction);
thingsWithClickListeners.set(openProof,openProofFunction);
thingsWithClickListeners.set(shortenAllInOntologyBtn,shortenAllInOntology);

//Mapping elements with input event to their function
const thingsWithInputListeners = new Map();
thingsWithInputListeners.set(lineLengthInput,changeFunction);
thingsWithInputListeners.set(maxLengthInput,maxLengthInputFunction);
thingsWithInputListeners.set(linkLengthIdealValue,simulate);
thingsWithInputListeners.set(flowStrength,simulate);

//Mapping elements with change event to their function
const thingsWithChangeListeners = new Map();
thingsWithChangeListeners.set(linkLengthFunctionInput, changeFunction);
thingsWithChangeListeners.set(flowDirection, changeFunction);

//Mapping elements with restart event to their function
const thingsWithRestartListeners = new Map();
const documentFunctionClick = (event) => documentFunction(event);
thingsWithRestartListeners.set(document, documentFunctionClick);

let simulation;

// creates the content of the view based on the chosen/read data
function createContent(data) {
  simulation = cola.d3adaptor(d3).avoidOverlaps(true);
  // Generate nodes and edges from the raw data
  const processedData = processData(data);
  nodeData = processedData.nodes;
  edgeData = processedData.edges;

  simulate();
  update(); 
}

function simulate({
  linkType = linkLengthFunctionInput.value,
  linkValue = linkLengthIdealValue.value,
  flowLayout = flowDirection.value,
  flowLayoutValue = flowStrength.value,
  startSeeds = [10, 20, 20]
} = {}) {
  if (updateLabels) {
    nodes.selectAll(".label").selectAll("text").each((d, i, n) => {
      let base = showSignature ? d.signature.split("\n") : d.axioms.split("\n");
      let previousLineCount = 0;
      if (/*shorteningModeInput.value === "none"*/showOriginal || d.revealed || d.tempRevealed) {
        n.forEach((textElement, i) => {
          if (wrapLines) {
            const textContainer = d3.select(textElement)
            const text = textContainer.text();
            textContainer.html("")
                .attr("x", 0)
                .attr("y", previousLineCount + "em")

            previousLineCount += Math.ceil(text.length / lineLengthInput.value);

            for (let j = 0; j < Math.ceil(text.length / lineLengthInput.value); j++) {
              textContainer.append("tspan")
                  .attr("x", 0)
                  .attr("dx", j ? "1em" : 0)
                  .attr("dy", j ? "1em" : 0)
                  .text(text.substring(lineLengthInput.value * j, lineLengthInput.value * (j + 1)))
            }
          } else {
            textElement.innerHTML = base[i];
          }
        });
      }else{
        n.forEach((textElement, i) => {
          textElement.innerHTML = SharedData.labelsShorteningHelper.shortenLabel(base[i], true, app.shorteningMethod)
        });
      }
      //   else if (/*shorteningModeInput.value*/app.shorteningMethod === "basic") {
      //   n.forEach((textElement, i) => {
      //     textElement.innerHTML = base[i].match(/^\s$/)
      //       ? ""
      //       : `${base[i].slice(0, maxLengthInput.value)}\u2026`;
      //   });
      // } else if (/*shorteningModeInput.value*/app.shorteningMethod  === "camel") {
      //   n.forEach((textElement, i) => {
      //     //const ccShortener = new camelCaseShorteningFunctions();
      //     textElement.innerHTML = base[i].match(/^\s$/)
      //       ? ""
      //       : SharedData.labelsShorteningHelper.shortenLabel(base[i], false, app.shorteningMethod)//ccShortener.shortenLabel(base[i]);
      //   });
      // }

      nodes.each((d) => {
        const node = d3.select("#" + ontologyNodeId + d.id).select(".label");
        d3.select("#" + ontologyNodeId + d.id)
          .select("rect")
          .attr("width", node.node().getBBox().width + BOX_PADDING)
          .attr("height", node.node().getBBox().height + BOX_PADDING)
          .attr("x", -node.node().getBBox().width / 2 - BOX_PADDING / 2)
          .attr("y", -BOX_PADDING / 2);
        d3.select("#" + ontologyNodeId + d.id)
          .select(".node-eye")
          .attr("x", -node.node().getBBox().width / 2 - BOX_PADDING / 2 + 2)
          .attr("y", node.node().getBBox().height / 2 - 7);

        node.attr(
          "transform",
          `translate(
              ${-node.node().getBBox().width / 2}, 
              13
            )`
        );
      });
    });
    updateLabels = false;
  }
  // update node size wrt content
  nodeData.forEach(function (d) { 
    let texts = showSignature ? d.signature.split("\n") : d.axioms.split("\n")
    d.width = Math.max(...texts.map((line) => line.length)) * 6.5 + 20; // character width + padding
    d.height = texts.length * 15 + 20;
  });

  simulation
    .nodes(nodeData)
    .links(edgeData);

  if (linkType === 'symmetric-diff') {
    simulation.symmetricDiffLinkLengths(linkValue)
  } else { // 'jaccard'
    simulation.jaccardLinkLengths(linkValue, 0.7)
  }

  simulation.flowLayout(flowLayout, +flowLayoutValue)
  simulation.start(...startSeeds);
  
  if (nodes) {
    nodes.call(simulation.drag);
    tick();
  }
}

function processData(data) {
  // Compute edges
  const edgeData = [].map.call(data.querySelectorAll("edge"), (d) => {
    const id = d.getAttribute("id");
    const source = d.getAttribute("source");
    const target = d.getAttribute("target");

    return { id, source, target };
  });

  //const coorX = 100, coorY = 30;
  const nodeData = [].map.call(data.querySelectorAll("node"), (d) => {
    let dataNodes, signature, axioms, axiomsMap, id, parentId;
    //let asserted = true;

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

    const edgeFromParent = edgeData.find((edge) => edge.source === id);

    parentId = edgeFromParent == null ? "" : edgeFromParent.target;

    return { id, signature, axioms, axiomsMap, parentId }; //, x:coorX+=20, y:coorY+=60};
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

function update() {
  // Clear the SVG content
  app.svgOntologyRootLayer.selectAll("*").remove();

  // define arrowheads
  const arrowPoints = [
    [0, 0],
    [0, 20],
    [20, 10],
  ];
  app.svgOntologyRootLayer
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", [0, 0, 20, 20])
    .attr("refX", 20)
    .attr("refY", 10)
    .attr("markerWidth", 8)
    .attr("markerHeight", 8)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", d3.line()(arrowPoints))
    .attr("fill", "darkgrey");

  drawGraph();
}

function drawGraph() {
  const linksG = app.svgOntologyRootLayer
    .append("g")
    .attr("id", "links")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  links = linksG
    .selectAll()
    .data(edgeData)
    .join("line")
    .attr("marker-end", (d) => {
      return "url(#arrowhead)";
    })
    .attr("class", "link ontLink")
    .attr("id", (d) => "L" + d.id);

  const nodesG = app.svgOntologyRootLayer
    .append("g")
    .attr("id", "nodes")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  nodes = nodesG
    .selectAll()
    .data(nodeData)
    .join("g")
    .classed("node ontNode", true)
    .attr("id", (d) => ontologyNodeId + d.id)
    .call(simulation.drag)
    .on("contextmenu", function (d, i) {
      d3.event.preventDefault();
      d.fixed = !d.fixed;
      d3.select(this)
        .classed("fixed-repairs", d.fixed);
      restoreColor();
      filterRepairs();
    })
    .on("mouseover", function (d) {
      if (/*shorteningModeInput.value !== "none"*/!showOriginal) {
        d3.select(this).select(".node-eye").transition().style("opacity", 1);
        d3.select(this)
          .selectAll("text")
          .transition()
          .style("transform", "translate(8px, 0)");

        d3.select(this).select(".node-eye").attr(
          "href",
          d.revealed ? "../icons/eye-crossed.svg" : "../icons/eye.svg"
        );
      }
    })
    .on("mouseout", function () {
      d3.select(this).select(".node-eye").transition().style("opacity", 0);
      d3.select(this)
        .select(".label")
        .selectAll("text")
        .transition()
        .style("transform", "translate(0, 0)");
    })
    .on("click", function (d) {
      d.revealed = !d.revealed;
      d3.select(this).select(".node-eye").attr(
        "href",
        d.revealed ? "../icons/eye-crossed.svg" : "../icons/eye.svg"
      );
      updateLabels = true;
      simulate();
    })
    .on("dblclick", function (d) {
      socket.emit("euler view", {id: d.id, parent: d.parentId, axioms: d.axioms.split("\n")})
    });

  nodes
    .append("rect")
    .attr("id", "frontRect")
    .attr("class", "bg-box")
    .attr("x", -170 / 2)
    .attr("y", 0)
    .attr("width", 170)
    .attr("height", 30);

  nodes
    .append("image")
    .attr("class", "node-eye")
    .attr("x", 0)
    .attr("y", -10)
    .attr("width", 14)
    .attr("height", 14)
    .attr("href", "../icons/eye-crossed.svg")
    .style("opacity", 0)

  let lockSigns = nodes.append("g")
    .attr("class", "lock-sign");
  lockSigns.append("circle")
    .attr("cy", -10)
    .attr("r", 10)
    .attr("fill", "var(--color-node-rule-stroke)")
  lockSigns.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -3)
    .attr("font-size", "5px")
    .attr("class", "material-icons")
    .text("\ue897")

  nodes.append("g").attr("class", "label");

  labelNodes();

  // Start the force directed layout
  simulation.on("tick", tick);
  simulation.on("end", () => document.dispatchEvent(eventDrawEnd));
}

function labelNodes() {
  nodes.each((d) => {
    const node = d3.select("#" + ontologyNodeId + d.id).select(".label");

    node.text("");

    let tmpText = showSignature ? d.signature.split("\n") : d.axioms.split("\n");

    let text = [];
    if (showOriginal)
      text = [...tmpText];
    else
      tmpText.forEach(x=>text.push(SharedData.labelsShorteningHelper.shortenLabel(x, true, app.shorteningMethod)));

    let dy = 0.3;

    text = text.sort((e1, e2) => e1.length - e2.length || e1.localeCompare(e2));
    let index = 0;
    let axiomCount = 0;
    let first = true;

    for (let i = 0; i < text.length; i++) {
      if (index < text.length) {
        if (first && index === 0)
          node.append("text").attr("fill", "black").text(text[index]);
        else {
          node.attr("dy", (dy -= 0.6) + "em");
          node
            .append("text")
            .attr("dy", axiomCount * 1.2 + "em")
            .attr("x", 0)
            .attr("fill", "black")
            .text(text[index]);
        }
      }

      index += 2;

      if (index >= text.length) {
        if (first) {
          text = text.sort(function (e1, e2) {
            return e2.length - e1.length || e2.localeCompare(e1);
          });
          if (text.length % 2 === 0) index = 0;
          else index = 1;
        } else {
          break;
        }
        first = false;
      }
      axiomCount++;
    }

    node.attr(
      "transform",
      `translate(
        ${-node.node().getBBox().width / 2}, 
        13
      )`
    );

    // adjust rectangle
    d3.select("#" + ontologyNodeId + d.id)
      .select("rect")
      .attr("width", node.node().getBBox().width + (2 * BOX_PADDING) / 2)
      .attr("height", node.node().getBBox().height + BOX_PADDING)
      .attr("x", -node.node().getBBox().width / 2 - BOX_PADDING / 2)
      .attr("y", -BOX_PADDING / 2);
    d3.select("#" + ontologyNodeId + d.id)
      .select(".node-eye")
      .attr("x", -node.node().getBBox().width / 2 - BOX_PADDING / 2 + 2)
      .attr("y", node.node().getBBox().height / 2 - 7);

    //d3.select("#" + ontologyNodeId + d.id).select("ellipse").transition().duration(500).attr("ry", numOfAxioms * 11).attr("rx", longestLength * 3.5);//.attr("rx", longestLength*6);
  });
}

function getSourceAndTarget(d) {
  // Calculate point on box
  const { height: sHeight, width: sWidth } = nodes
    .nodes()
    .find((node) => node.id === ontologyNodeId + d.source.id)
    .getBBox();
  const { height: tHeight, width: tWidth } = nodes
    .nodes()
    .find((node) => node.id === ontologyNodeId + d.target.id)
    .getBBox();

  // Source Reference
  const sRef = {
    x: d.source.x,
    y: d.source.y - BOX_PADDING / 2,
  };
  const tRef = {
    x: d.target.x,
    y: d.target.y - BOX_PADDING / 2,
  };

  // Source
  const sCenter = {
    x: sRef.x,
    y: sRef.y + sHeight / 2,
  };
  // Target
  const tCenter = {
    x: tRef.x,
    y: tRef.y + tHeight / 2,
  };
  // Vector Source -> Target
  const vecTS = {
    x: sCenter.x - tCenter.x,
    y: sCenter.y - tCenter.y,
  };
  const vecV = {
    x: 0,
    y: -1,
  };

  const angCrit = Math.atan(tWidth / tHeight);
  const angBeta = Math.acos(
    (vecTS.y * vecV.y) / Math.sqrt(vecTS.x ** 2 + vecTS.y ** 2)
  );

  const tContact = {};
  if (angBeta <= angCrit) {
    // 1
    tContact.x = (tCenter.x - ((tCenter.x - sCenter.x) * (tHeight / 2)) / (tCenter.y - sCenter.y));
    tContact.y = tCenter.y - tHeight / 2;
  } else if (angBeta >= Math.PI - angCrit) {
    // 3
    tContact.x = (tCenter.x + ((tCenter.x - sCenter.x) * (tHeight / 2)) / (tCenter.y - sCenter.y));
    tContact.y = tCenter.y + tHeight / 2;
  } else {
    if (sCenter.x > tCenter.x) {
      // 2
      tContact.x = tCenter.x + tWidth / 2;
      tContact.y = (tCenter.y + ((tCenter.y - sCenter.y) * (tWidth / 2)) / (tCenter.x - sCenter.x));
    } else {
      // 4
      tContact.x = tCenter.x - tWidth / 2;
      tContact.y = (tCenter.y - ((tCenter.y - sCenter.y) * (tWidth / 2)) / (tCenter.x - sCenter.x));
    }
  }

  return {
    source: { height: sHeight, width: sWidth, contact: sCenter },
    target: { height: tHeight, width: tWidth, contact: tContact }
  };
}

function tick() {
  links
    .each((d) => {
      d.link = getSourceAndTarget(d);
    })
    .attr("x1", (d) => d.link.source.contact.x)
    .attr("y1", (d) => d.link.source.contact.y)
    .attr("x2", (d) => d.link.target.contact.x)
    .attr("y2", (d) => d.link.target.contact.y);

  nodes.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

  
  newSim && document.dispatchEvent(eventDrawEnd);
  newSim = false;
}

function resetLayout() {
  simulation.nodes().forEach((d) => {
    d.fx = null;
    d.fy = null;
  });
}

function saveLayout() {
  const data = {
    ontology: `${adOntologyFile.name}`,
    nodes: [],
  }
  simulation.nodes().forEach(({ id, x, y }) => {
    data.nodes.push({ id, x, y });
  })

  saveAs(
    new Blob([JSON.stringify(data)], { type: "data:application/json;charset=utf-8," }),
    adOntologyFile.name.substring(0, adOntologyFile.name.indexOf(".")) + "_layout.json"
  );
}

export function loadOntology(e) {
  const ontology = e.target.files[0];
  progress('Uploading...');
  upload(ontology, uploaded => {
    console.log('Uploaded: ', uploaded);
    progress('Ontology uploaded.');
    progress('Extracting concept names...');
    
    fetch('/extract-names/?id=' + getSessionId() + '&ontology=' + ontology.name + '&reasoner=' +
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
  });
}

export function loadAtomicDecomposition(e) {
  adOntologyFile = e.target.files[0];
  upload(adOntologyFile, result => {
    console.log('Success:', result);
    d3.xml("../data/" + getSessionId() + "/" + adOntologyFile.name).then((xml) => {
      app.svgOntologyRootLayer.selectAll("*").remove();
      createContent(xml);
    });
  });
}

export function loadLayout(e) {
  layoutFile = e.target.files[0];

  const reader = new FileReader();

  reader.onload = (e) => {
    const result = JSON.parse(e.target.result);

    if (!result.ontology || !result.nodes) {
      M.toast({ html: 'Warning: JSON file is malformed' })
      console.error('JSON file is malformed')
      return;
    }
    if (!adOntologyFile) {
      M.toast({ html: 'Warning: No ontology file loaded' })
      console.error('No ontology file loaded')
      return;
    }

    result.nodes.forEach(({ id, x, y }) => {
      simulation.nodes().forEach(sNode => {
        if (sNode.id === id) {
          sNode.fx = x;
          sNode.fy = y;
        }
      })

      simulate();
    })
  }

  reader.readAsText(layoutFile);
}

export function init_ontology(ad_file_name, ontology_file_param) {
  //Remove listeners of types
  removeListeners("click",thingsWithClickListeners);
  removeListeners("input",thingsWithInputListeners);
  removeListeners("change",thingsWithChangeListeners);
  removeListeners("restart",thingsWithRestartListeners);

  adOntologyFile = {
    name: ontology_file_param ? ad_file_name : 'atomic ontology.xml'
  };

  ontologyFile = {
    name: ontology_file_param
  };

  socket.on("highlight axioms", (data) => {
    restoreColor();
    if (data && data.id === getSessionId()) {
      highlightNodesOf(data.pre);
    }
  });

  socket.on("set ontology", (data) => {
    if (data && data.id === getSessionId()) {
      if (!adOntologyFile) {
        computingRepairsFailed("Please select an ontology file");
      } else {
        showRepairsTab(false); // from controls.js
        computingRepairs();
        socket.emit("get repairs", {
          id: data.id,
          axiom: data.axiom,
          readableAxiom: data.readableAxiom,
          ontologyFile: ontologyFile.name,
          reasoner:document.getElementById('diagnosesReasoner').value
        });
      }
    }
  });

  socket.on("read repairs", (data) => {
    if (data && data.id === getSessionId()) {
      if (data.msg === "mDs.txt is now available!") {
        readRepairs({ axiom: data.axiom, file: "../data/" + data.id + "/mDs_" + data.id + ".txt" });
      } else {
        computingRepairsFailed(data.msg);
      }
    }
  });

  // Configure SVG
  //TODO this is just a quick fix, the rest of the vars should be handled in the same way
  if(!app.svgOntology) {
    app.svgOntology = document.getElementById("ontology-view")
    margin = {top: 30, right: 10, bottom: 30, left: 10};
    contentWidth = app.svgOntology.clientWidth - margin.left - margin.right;
    contentHeight = app.svgOntology.clientHeight - margin.top - margin.bottom;

    app.svgOntologyRootLayer = d3
        .select("#ontology-view")
        .attr("width", contentWidth + margin.left + margin.right)
        .attr("height", contentHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .style("user-select", "none");
  }
  document.addEventListener("restart", documentFunctionClick)

  // CONTROLS ==========================================

  btnShowSignature.checked = true;
  btnShowSignature.addEventListener("click", btnShowSignatureFunction);

  btnWrapLines.checked = false;
  btnWrapLines.addEventListener("click", btnWrapLinesFunction);

  lineLengthInput.closest(".modal-option.modal-option-range").style.display = "none";
  lineLengthInput.addEventListener("input", changeFunction);

  resetLayoutButton.addEventListener("click", resetLayout);
  saveLayoutButton.addEventListener("click", saveLayout);
  showRepairsMenuButton.addEventListener("click", showRepairsTab);

  maxLengthInput.addEventListener("input", maxLengthInputFunction);

  maxLengthInput.closest(".input-range-wrapper").style.display = "none";

  // shorteningModeInput.addEventListener("change", function () {
  //   maxLengthInput.closest(".input-range-wrapper").style.display = this.value === "basic" ? "block" : "none";
  //   updateLabels = true;
  //   simulate();
  // });

  linkLengthFunctionInput.addEventListener("change", changeFunction);
  linkLengthIdealValue.max = 300;
  linkLengthIdealValue.min = 10;
  linkLengthIdealValue.value = 50;
  linkLengthIdealValue.addEventListener("input", simulate);
  linkLengthIdealValueReset.addEventListener("click", linkLengthIdealValueResetFunction);

  flowDirection.addEventListener("change", changeFunction);
  flowStrength.max = 500;
  flowStrength.min = 10;
  flowStrength.value = 50;
  flowStrength.addEventListener("input", simulate);
  flowStrengthReset.addEventListener("click", flowStrengthResetFunction);

  document.querySelectorAll("input[type=range]").forEach(range => {
    range.closest(".modal-option-range").querySelector("span.new.badge").innerText = range.value;

    function rangeFunction() {
        range.closest(".modal-option-range").querySelector("span.new.badge").innerText = range.value;
    }
    range.removeEventListener("input", rangeFunction)
    range.addEventListener("input", rangeFunction)
  })


  openProof.addEventListener('click', openProofFunction);

  d3.xml("../data/" + getSessionId() + "/" + adOntologyFile.name).then((xml) => {
    createContent(xml);
    thumbnailViewer({ mainViewId: "ontology-view", containerSelector: "#ontology-container" });
  });

  showOriginal = true;
  updateShorteningButton();
  shortenAllInOntologyBtn.addEventListener("click", shortenAllInOntology);
}

function shortenAllInOntology(){
  //Update shortening button
  showOriginal = !showOriginal
  updateShorteningButton(this);

  updateLabels = true;

  simulate();
  labelNodes();
}

function updateShorteningButton() {
  if (showOriginal){
    shortenAllInOntologyBtn.textContent = "Shorten all";
    shortenAllInOntologyBtn.title = "Shorten all text in the ontology";
  }else{
    shortenAllInOntologyBtn.textContent = "Undo shortening";
    shortenAllInOntologyBtn.title = "Undo shortening effect in the ontology";
  }
}

function btnShowSignatureFunction () {
  showSignature = this.checked;
  if (SharedData.labelsShorteningHelper instanceof BasicSophisticatedShorteningFunctions)
    SharedData.labelsShorteningHelper.resetAll();
  updateLabels = true;
  simulate();
  labelNodes();
}

function btnWrapLinesFunction () {
  wrapLines = this.checked;
  lineLengthInput.closest(".modal-option.modal-option-range").style.display = this.checked ? "block" : "none";
  updateLabels = true;
  simulate();
  labelNodes();
}

function maxLengthInputFunction() {
  if (!showOriginal) {
    updateLabels = true;
    simulate();
    labelNodes();
  }
}

function linkLengthIdealValueResetFunction(){
  linkLengthIdealValue.value = 50;
  simulate();
}

function flowStrengthResetFunction() {
  flowStrength.value = 50;
  simulate();
}

function openProofFunction() {
  window.open('/proof?id=' + getSessionId())
}

function changeFunction(){
  updateLabels = true;
  simulate();
}

function documentFunction(e){
  console.log("here");
  console.log(e)
  if (e.detail) {
    updateLabels = e.detail.updateLabels;
  }
  simulate();
}