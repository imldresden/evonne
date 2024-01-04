import { globals } from "../shared-data.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import { processData, processDataLinear } from "./data/process-data.js";
import { upload } from '../utils/upload-file.js';

import { AxiomFunctionsHelper } from "./axiomFunctions.js";
import { InferenceRulesHelper } from "./rules/rules.js";
import { NodeVisualsHelper, nodeVisualsDefaults } from "./nodeVisualsHelper.js";
import { MagicNavigationHelper } from "./magicNavigation.js";
import * as lP from "./linearProof/linearProofHelper.js";

import { utils as ruleUtils } from "./rules/rules.js";
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

  // proof exclusive
  nodeVisualsHelper: new NodeVisualsHelper(),
  inferenceRulesHelper: new InferenceRulesHelper(),
  axiomFunctionsHelper: undefined,
  magicNavigationHelper: new MagicNavigationHelper(),

  hierarchy: undefined,
  nodes: undefined,
  links: undefined,
  buttons: undefined,
  axioms: undefined,
  rules: undefined,
  labels: undefined,
  root: undefined,
  edgeData: undefined,
  currentMagicAction: undefined,

  nodeWithVisibleButtons: { id: "nothing" },
  nodesCurrentDisplayFormat: new Map(),
  nodesDisplayFormat: new Map(),

  maxNodeWidth: 200, 
  maxNodeHeight: 45,
  allowOverlap: false,

  //TODO for now I kept it as it is, but we might want to change the way we update _hierarchy and create the new hierarchy
  createHierarchy: function (data) {

    // Create the stratify function for our data
    let stratify = d3.stratify()
      .id(d => d.source.id)
      .parentId(d => d.target.id);

    // Stratify our data --> Conclusion is the root node, asserted axioms are the leaf nodes
    return stratify(data);
  },

  getNodeWidth: function (node) {
    // estimation of the size of each character
    const display = this.nodesCurrentDisplayFormat.get(`N${node.data.source.id}`)
    let label = "";
    if (!display || display === "original") {
      label = node.data.source.element;
    } else if (display === "shortened") {
      label = globals.labelsShorteningHelper.shortenLabel(node.data.source.element, proof.isRuleShort, globals.shorteningMethod);
    } else if (display === "textual") {
      label = node.data.source.nLElement;
    }

    node.width = label.length * globals.fontCharacterWidth + 16;

    return node.width;
  },

  setNodeWidthsAndMax: function (node) {
    // computes all widths, saves them per node and sets max
    if (node !== null) {
      this.getNodeWidth(node);
      if (node.width > this.maxNodeWidth) {
        this.maxNodeWidth = node.width;
      }

      node.children ? node.children.forEach(a => {
        this.setNodeWidthsAndMax(a);
      }) : undefined;
    } else {
      console.error('received null node')
    }
  },

  computeTreeLayout: function (hierarchy) {
    // Layout and draw the tree
    hierarchy.dx = 50;
    hierarchy.dy = proof.proofWidth / (hierarchy.height + 1);
    let tree_layout;

    if (this.allowOverlap) {
      // tries to fit to screen 
      tree_layout = d3.tree()
        .size([proof.proofWidth, proof.proofHeight])
        .separation((a, b) => this.separation(a, b))
        (hierarchy);
    } else {

      tree_layout = d3.tree()
        .nodeSize([this.maxNodeWidth, this.maxNodeHeight * 1.2])
        .separation((a, b) => this.separation(a, b))
        (hierarchy);
    }

    return tree_layout;
  },

  showAll: function () {
    d3.selectAll(".node").style("opacity", 1);
  },

  update: function (source, drawTime = proof.drawTime) {
    this.setNodeWidthsAndMax(this.hierarchy); 

    if (proof.isLinear) {
      this.root = lP.computeLinearLayout(this.hierarchy);
    } else {
      this.root = this.computeTreeLayout(this.hierarchy);
    }

    this.drawTree(source, drawTime);

    // Add axiom buttons depending on the navigation mode (Normal vs Magic)
    if (proof.isMagic) {
      let originalHierarchy = proof.createHierarchy(proof.edgeData);
      proof.updateHierarchyVars(originalHierarchy);
      this.magicNavigationHelper.entireProofHierarchy = originalHierarchy;
      this.magicNavigationHelper.addMagicNavButtonsToNodes();
    } else {
      this.axiomFunctionsHelper.addFunctionButtonsToNodes();
    }

    //add tooltips to rule names
    this.inferenceRulesHelper.addTooltipToNodes();

    // Enable collapsing
    // axioms.on("dblclick", d => {
    //   d.children = d.children ? null : d._children;
    //   update(d);
    // });
  },

  expandLabel: function (d, n) {
    let node = d3.select(n);

    if (d.data.source.element_short) {
      node.select("text").text(d.data.source.element);
      node.select(".backgroundRect")
        .style("visibility", "visible");
      this.hideRest(d);
    }
  },

  //TODO: If axiom is partially visible, show the enlarged version to the left of the node instead the right
  //Bring forth the selected axiom
  hideRest: function (data) {
    // var others = d3.selectAll(".node").filter(function(d){return d.depth === data.depth && d != data});
    let others = d3.selectAll(".node").filter(d => d === data.closest_right_neighbor);

    others.transition().duration(100).ease(d3.easeLinear).style("opacity", .1);
    //Hide the corresponding delink button, This requires a link button of id = detachButton + nodeID(N+num)
    others.each(x => {
      d3.select("#detachButtonN" + x.data.source.id)
        .transition().duration(100).ease(d3.easeLinear).style("opacity", .1);
    });
  },

  addMouseEvents: function () {
    this.nodes.selectAll("g")
      .on("mouseover", (d, i, n) => {
        this.expandLabel(d, n[i]);
      })
      .on("mouseout", (d, i, n) => {
        this.collapseLabel(d, n[i]);
      });
  },

  removeMouseEvents: function () {
    this.nodes.selectAll("g")
      .on("mouseover", null)
      .on("mouseout", null);
  },

  collapseLabel: function (d, n) {
    if (d.selected) return;

    let node = d3.select(n);

    if (d.data.source.element_short) {
      node.select("text").text(d.data.source.element_short);
      node.select(".backgroundRect")
        .style("visibility", "hidden");
      this.showRest(d);
    }
  },

  addFocusFunctionality: function () {
    this.nodes.selectAll("g").on('mouseover', function (d) {
      const nodes = d3.select("#proof-view").selectAll(".node");
      nodes.sort((a, b) => (a.id === d.id) ? 1 : (b.id === d.id) ? -1 : 0);
    });
  },

  //Reset axioms to initial state
  showRest: function (data) {
    // var others = d3.selectAll(".node").filter(function(d){return d.depth === data.depth && d != data});
    let others = d3.selectAll(".node").filter(d => d === data.closest_right_neighbor);

    others.transition()
      .duration(100)
      .ease(d3.easeLinear)
      .style("opacity", 1);
    //Show the corresponding delink button, This requires a link button of id = detachButton + nodeID(N+num)
    others.each(x => {
      d3.select("#detachButtonN" + x.data.source.id)
        .transition()
        .duration(100)
        .ease(d3.easeLinear)
        .style("opacity", 1);
    });
  },

  restOfProofNode: { id: "r0", element: "", type: "rest" },

  showSubTree(root) {
		//extract the current data
		let originalEdgeData = this.extractOriginalData(root);
		//reset all children to show the entire subtree, defined in axiomFunctions.js
		proof.axiomFunctionsHelper.resetAllChildren(root);
		//extract the data of the subtree
		let newEdgesData = this.extractData(root);
		//create a new hierarchy
		let newHierarchy = proof.createHierarchy(newEdgesData);
		proof.updateHierarchyVars(newHierarchy);
		//preserve previous sub-structure
		let previousHierarchy = proof.createHierarchy(originalEdgeData);
		proof.updateHierarchyVars(previousHierarchy);
		let found;
		newHierarchy.children[0].descendants().forEach(x => {
			found = previousHierarchy.descendants().find(y => y.data.source.id === x.data.source.id);
			if (found && !found.children) {
				x.children = null;
			}
		});
		//update the graph
		proof.updateHierarchy(newHierarchy);
	},

	extractOriginalData(root) {
		let data = [
			{
				id: "L-1",
				source: root.data.source,
				target: ""
			}
		];

		root.links().forEach(entry => data.push(entry.target.data));
		return data;
	},

	extractData(root) {
		let data = [
			{
				id: "L-1",
				source: this.restOfProofNode,
				target: ""
			},
			{
				id: "rest",
				source: root.data.source,
				target: this.restOfProofNode
			}

		];
		root.links().forEach(entry => data.push(entry.target.data));
		return data;
	},

  drawTree: function (source, drawTime) {
    //remove on end functions from previous drawing
    this.removeMouseEvents();

    //remove the focus effect of the previous drawing
    this.showAll();

    // Create a transition for blending in the tree
    let t = proof.svgProof.transition()
      .duration(drawTime)
      .on("start", () => {
        proof.isDrawing = true;
      })
      .on("end", () => {
        this.addFocusFunctionality();
        proof.isDrawing = false;
        document.dispatchEvent(new CustomEvent("drawend", { detail: { main: "proof-view" } }));
      });

    // Add the data
    this.nodes.selectAll("g")
      .data(this.root.descendants(), d => "N" + d.data.source.id)
      .join(
        enter => {
          const that = this;

          enter.append("g")
            .attr("class", d => {
              let classStr;
              if (ruleUtils.isRule(d.data.source.type)) {
                classStr = "node rule";
              } else {
                classStr = "node " + d.data.source.type;
              }
              classStr = !d.parent && d.data.source.type !== "rest" ? classStr + " conclusion" : classStr;
              return classStr;
            })
            .attr("id", d => "N" + d.data.source.id)
            /*TODO change x0 to x of the parent/child magic box, same for y*/
            .attr("transform", d => `translate(${d.x0}, ${proof.proofHeight - parseInt(d.y0)})`)

            /*.each(function (d) {
              switch (that.currentMagicAction) {
                case "pullUp":
                  console.log("pullUp", this);
                  d3.select(this)
                      .call(element => {
                        const stops = [d];
                        let nextParent = d.parent
                        while (nextParent) {
                          stops.push(nextParent);
                          nextParent = nextParent.parent;
                        }
                        console.log(stops);

                        function cat(index) {
                          if (stops[index + 1] && !stops[index].data.id.startsWith("MN")) {
                            return cat(index + 1)
                                .transition()
                                .duration(drawTime)
                                .attr("transform", (d, i, n) => `translate(${stops[index].x}, ${proof.proofHeight - parseInt(stops[index].y)})`)
                          } else {
                            return element
                                .transition()
                                .duration(drawTime)
                                .attr("transform", (d, i, n) => `translate(${stops[index].x}, ${proof.proofHeight - parseInt(stops[index].y)})`)
                          }
                        }

                        cat(0)
                      })
                  break;

                default:
                  break;
              }
            }) */
            .transition(t)
            .attr("transform", (d, i, n) => `translate(${d.x}, ${proof.proofHeight - parseInt(d.y)})`)
        },
        update => {
          update
            .transition(t)
            .attr("transform", d => `translate(${d.x}, ${proof.proofHeight - parseInt(d.y)})`)
        },
        exit => {
          exit
            .transition(t).ease(d3.easeLinear).style("opacity", 0)
            .remove()
        }
      );
    // Draw links
    if (!proof.isLinear) {
      this.links.selectAll("line")
        .data(this.root.links(), d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
        //.join("line")
        .join(
          enter => {
            const that = this;
            const container = enter.append("line")
              .attr("marker-end", d => d.source.data.source.type === "rest" ? "" : "url(#arrowhead)")
              //.attr("marker-mid", "url(#arrowhead)")
              .attr("class", d =>
                (d.source.data.source.type === "rest" ? "link torest" : "link") +
                (d.source.data.target.type === "axiom" && !proof.isMagic ? " from-axiom " : "")
              )
              .attr("id", d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
              .attr("cursor", d => d.source.data.target.type === "axiom" ? "pointer" : "auto")
              .on("click", (_, d) => {
                if (!proof.isMagic && d.source.data.target.type === "axiom") {
                  this.showSubTree(d.target);
                }
              })
              .attr("x1", d => d.target.x0)
              .attr("y1", d => proof.proofHeight - d.target.y0 + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x0)
              .attr("y2", d => proof.proofHeight - d.source.y0)
              /*.each(function (d) {
                switch (that.currentMagicAction) {
                  case "pullUp":
                    console.log("pullUp", this, d);
                    d3.select(this)
                        .call(element => {
                          const stops = [d.target];
                          let nextParent = d.target.parent
                          while (nextParent) {
                            stops.push(nextParent);
                            nextParent = nextParent.parent;
                          }
                          console.log(stops);

                          function cat(index) {
                            if (index === 0 && stops[index + 1]) {
                              return cat(index + 1)
                                  .transition()
                                  .duration(10)
                                  .attr("opacity", 1)
                                  .transition()
                                  .duration(drawTime)
                                  .attr("x1", () => stops[index].x)
                                  .attr("y1", () => proof.proofHeight - stops[index].y + nodeVisualsDefaults.BOX_HEIGHT)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => proof.proofHeight - d.source.y)
                            } else if (stops[index + 1] && !stops[index].data.id.startsWith("MN")) {
                              return cat(index + 1)
                                  .transition()
                                  .duration(drawTime)
                                  .attr("x1", d => stops[index].x)
                                  .attr("y1", d => proof.proofHeight - stops[index].y + nodeVisualsDefaults.BOX_HEIGHT)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => proof.proofHeight - d.source.y)
                            } else {
                              return element
                                  .transition()
                                  .duration(10)
                                  .attr("opacity", 0)
                                  .transition()
                                  .duration(drawTime)
                                  .attr("x1", d => d.source.x)
                                  .attr("y1", d => proof.proofHeight - d.source.y)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => proof.proofHeight - d.source.y)
                            }
                          }

                          cat(0)
                        })
                    break;

                  default:
                    break;
                }
              })
              */
              .transition(t)
              .attr("x1", d => d.target.x)
              .attr("y1", d => proof.proofHeight - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x)
              .attr("y2", d => proof.proofHeight - d.source.y);

            /*
            container.append("g")
                .attr("class", "edge-button")
                .attr('id', d => 'detachButtonN' + d.target.data.source.id)
                .attr("cursor", "pointer")
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${proof.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${proof.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })

            container
                .append("circle")
                .attr("cx", 0)
                .attr("cy", -8)
                .attr("r", 14)
                .attr("fill", "#ccc")
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${proof.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${proof.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })

            container
                .append("text")
                .attr('class', 'edgelabel material-icons')
                .style('font-size', '16px')
                .style('fill', 'white')
                .text('\ue14e')
                .attr("text-anchor", "middle")
                .on("click", d => {
                    this.showSubTree(d.target);
                })
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${proof.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${proof.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })
            */
          },
          update => {
            update
              .transition(t)
              .attr("x1", d => d.target.x)
              .attr("y1", d => proof.proofHeight - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x)
              .attr("y2", d => proof.proofHeight - d.source.y)
          },
          exit => {
            exit.remove()
          }
        );
    } else {
      lP.drawCurvedLinks(t);
    }

    if (!proof.isLinear) {
      this.edgeData.forEach(function (link) {
        if (link.source.element === "Asserted Conclusion")
          d3.select("#N" + link.target.id).attr("class", "node axiom asserted");
        if (link.source.element === "Known")
          d3.select("#N" + link.source.id).attr("class", "node rule krule");
      });
    }

    this.nodeVisualsHelper.svg = proof.svgProof;
    this.nodeVisualsHelper.nodes = this.nodes;
    this.nodeVisualsHelper.renderNodes();

    // Stash the old positions for transition.
    this.hierarchy.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  },

  updateHierarchy: function (newHierarchy) {
    //update the global variable "hierarchy"
    this.hierarchy = newHierarchy;
    //To hide all buttons
    this.nodeVisualsHelper.initVarsAxiomFunctions();

    this.advancedUpdate();
  },

  resetHierarchy: function () {
    let originalHierarchy = this.createHierarchy(proof.edgeData);
    this.updateHierarchyVars(originalHierarchy)
    this.updateHierarchy(originalHierarchy);
  },

  updateHierarchyVars: function (someHierarchy, subRoot, action) {
    let common = [];
    let commonElement;
    let magic = this.magicNavigationHelper.getMagic(subRoot, action);
    someHierarchy.descendants().forEach(x => {
      commonElement = this.hierarchy.descendants().find(y => y.data.id === x.data.id);
      if (commonElement) {
        common.push(commonElement)
      }
    });

    if (proof.isMagic && someHierarchy !== this.hierarchy) {
      someHierarchy.descendants().forEach((d, i) => {
        d.x0 = magic ? parseInt(magic.x) : proof.proofWidth / 2;
        d.y0 = magic ? parseInt(magic.y) : 0;
        let originalSource = common.find(x => x.data.target.id === d.data.source.id);
        let originalTarget = common.find(x => x.data.source.id === d.data.source.id);
        if (originalSource) {
          const { x, y, id } = originalSource.parent;
          d.x0 = x;
          d.y0 = y;
          d.id = id;
        } else if (originalTarget) {
          const { x, y, id } = originalTarget;
          d.x0 = x;
          d.y0 = y;
          d.id = id;
        }
        // d.id = i;
        d._children = d.children;
      });
    } else {
      someHierarchy.descendants().forEach((d, i) => {
        d.x0 = proof.proofWidth / 2;
        d.y0 = 0;
        d.id = i;
        d._children = d.children;
      });
    }
  },

  advancedUpdate: function (drawTime = proof.drawTime) {
    this.update(drawTime);
  },

  separation: function (a, b) {
    return ((a.width + b.width) / 2) / this.maxNodeWidth + 0.03;
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

  proof.axiomFunctionsHelper = new AxiomFunctionsHelper(socket);
  
  // configure the html 
  allowOverlapBtn.checked = false;
  overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
  navigationToggleBtn.checked = false;
  shorteningRuleNamesBtn.checked = false;

  proof.isMagic = false;
  proof.currentMagicAction = "";
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

function getInitialMagicalHierarchy(data) {
  let result = [];
  let magicBox = proof.magicNavigationHelper.getNewMagicBox();
  let fake = data.find((x) => x.id === "L-1");
  data
    .filter((x) => x.source.element === "Asserted Conclusion")
    .forEach((x) => {
      result.push(x);
      result.push(
        proof.magicNavigationHelper.getNewEdge(x.target, magicBox)
      );
    });
  result.push(
    proof.magicNavigationHelper.getNewEdge(magicBox, fake.source)
  );
  result.push(fake);
  return result;
}

function createContent(data) {
  // Generate nodes and edges from the raw data
  let processedData;
  if (proof.isLinear) {
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
  proof.edgeData = edgeData;

  // initialize hierarchy depending on the navigation mode
  proof.hierarchy = proof.isMagic
    ? proof.createHierarchy(getInitialMagicalHierarchy(edgeData))
    : proof.createHierarchy(edgeData);

  // update and draw the tree
  proof.updateHierarchyVars(proof.hierarchy);

  proof.links = proof.svgProofRootLayer
    .append("g")
    .attr("id", "links")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  proof.nodes = proof.svgProofRootLayer
    .append("g")
    .attr("id", "nodes");

  proof.labels = proof.svgProof.selectAll("#nodes");
  proof.advancedUpdate();
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
  proof.nodeVisualsHelper.initVarsAxiomFunctions();
  // initVarsLinkFunctions();

  upload(proof.proofFile, result => {
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
  proof.allowOverlap = this.checked;
  overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
  proof.advancedUpdate(proof.hierarchy);
}

function navigationToggleBtnFunction() {
  if (this.checked) {
    // disable magic mode
    magicToggleBtn.checked = false;
    proof.isMagic = false;
    proof.currentMagicAction = "";
    proof.resetHierarchy();
    proof.axiomFunctionsHelper.showConclusionOnly();
  } else {
    proof.resetHierarchy();
  }
}

function shorteningRuleNamesBtnFunction() {
  proof.isRuleShort = this.checked;
}

function magicToggleBtnFunction() {
  // Clear the SVG content
  proof.svgProofRootLayer.selectAll("*").remove();
  if (this.checked) {
    navigationToggleBtn.checked = false;
    layoutToggleBtn.checked = false;
    proof.isLinear = false;
  }
  proof.isMagic = this.checked;
  if (!proof.isMagic) {
    proof.currentMagicAction = undefined;
  }

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    proof.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function layoutToggleBtnFunction() {

  // Clear the SVG content
  proof.svgProofRootLayer.selectAll("*").remove();
  navigationToggleBtn.checked = false;
  if (this.checked) {
    magicToggleBtn.checked = false;
    proof.isMagic = false;
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "block"
  }
  else {
    planarToggleBtn.closest(".planar-div-wrapper").style.display = "none"
  }
  proof.isLinear = this.checked;

  d3.xml("../data/" + getSessionId() + "/" + getFileName()).then((xml) => {
    proof.svgProofRootLayer.selectAll("*").remove();
    createContent(xml);
  });
}

function planarToggleBtnFunction() {
  proof.isDistancePriority = this.checked;
  proof.advancedUpdate(proof.hierarchy);
}

function shortenAllInProofBtnFunction() {
  original = !original
  let nodeID

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
      proof.nodesDisplayFormat.set(nodeID, "original");
      proof.nodesCurrentDisplayFormat.set(nodeID, "original");
    });
  }

  //Record the shortening
  d3.selectAll(nodesClass).filter(d => d).each(d => {
    nodeID = "N" + d.data.source.id;
    if (!original && proof.nodesDisplayFormat.get(nodeID) !== "textual") {
      proof.nodesDisplayFormat.set(nodeID, "shortened");
      proof.nodesCurrentDisplayFormat.set(nodeID, "shortened");
    } else if (proof.nodesDisplayFormat.get(nodeID) !== "textual") {
      proof.nodesDisplayFormat.set(nodeID, "original");
      proof.nodesCurrentDisplayFormat.set(nodeID, "original");
    }
  });

  //Redraw
  proof.advancedUpdate();
}

function proofWidthRangeResetBtnFunction() {
  proof.proofWidth = proof.proofWidth;
  proofWidthRange.value = proof.proofWidth;
  proof.advancedUpdate(proof.hierarchy);
}

function proofHeightRangeResetBtnFunction() {
  proof.proofHeight = proof.proofHeight;
  proofHeightRange.value = proof.proofHeight;
  proof.advancedUpdate(proof.hierarchy);
}

function maxLengthInputFunction() {
  if (globals.labelsShorteningHelper) {
    globals.labelsShorteningHelper.applyShortening(globals.shorteningMethod);
    proof.advancedUpdate(proof.hierarchy);
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
    proof.advancedUpdate(proof.hierarchy);
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
    proof.advancedUpdate(proof.hierarchy);
  }
}

function proofWidthRangeFunction() {
  proof.proofWidth = this.value;
  proof.advancedUpdate(proof.hierarchy);
}

function minVerticalCompactnessInputFunction() {
  const clampedMin =
    minVerticalCompactnessInput.value * proof.proofHeight >
    proofHeightRange.value;
  proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * proof.proofHeight);

  if (clampedMin) {
    proofHeightRange.value = proofHeightRange.min;
    proof.proofHeight = proofHeightRange.min;
    proof.advancedUpdate(proof.hierarchy);
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
    proof.advancedUpdate(proof.hierarchy);
  }
}

function proofHeightRangeFunction() {
  proof.proofHeight = this.value;
  proof.advancedUpdate(proof.hierarchy);
}

function openOntologyFunction() {
  window.open('/ontology?id=' + getSessionId())
}

function shorteningMethodSelectionFunction() {
  maxLengthInput.closest(".input-range-wrapper").style.display = this.value === "basic" ? "block" : "none";

  globals.shorteningMethod = this.value;
  proof.advancedUpdate(proof.hierarchy);
}

function tooltipPositionSelectionFunction() {
  proof.ruleExplanationPosition = this.value;
  proof.advancedUpdate(proof.hierarchy);
}

function windowFunction() {
  proof.advancedUpdate();
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