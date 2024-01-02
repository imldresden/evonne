import { InferenceRulesHelper } from "./proof/rules/rules.js";
import { APP_GLOBALS as app } from "./shared-data.js";
import { nodeVisualsDefaults, NodeVisualsHelper } from "./proof/nodeVisualsHelper.js";
import { MagicNavigationHelper } from "./proof/magicNavigation.js";
import { LabelsShorteningHelper } from "./shortening/helper.js";
import * as lP from "./proof/linearProof/linearProofHelper.js";
import { ContextMenu } from "./utils/context-menu.js";
import { utils as ruleUtils } from "./proof/rules/rules.js";

const APP_GLOBALS = {
  svgProof: undefined,
  svgProofRootLayer: undefined,
  svgOntology: undefined,
  svgOntologyRootLayer: undefined,
  BBox: undefined,
  SVGwidth: undefined,
  SVGheight: undefined,
  margin: undefined,
  contentWidth: undefined,
  proofWidth: undefined,
  proofHeight: undefined,
  contentHeight: undefined,
  designModeIsNew: 0,
  isMagic: false,
  isRuleShort: false,
  proofFile: undefined,
  signatureFile: undefined,
  ruleExplanationPosition: undefined,
  isDrawing: false,
  isDebug: true,
  drawTime: 750,
  shorteningMethod: "camel",
  shortenAllInProof: false,
  shortenAllInOntology: false,
  isLinear: false,
  isDistancePriority: true,
  fontCharacterWidth: 8.1,
}

const SharedData = {
  nodeVisualsHelper: new NodeVisualsHelper(),
  inferenceRulesHelper: new InferenceRulesHelper(),
  contextMenu: new ContextMenu(),
  labelsShorteningHelper: new LabelsShorteningHelper(),

  // proof exclusive
  axiomFunctionsHelper: undefined,
  linkFunctionsHelper: undefined,
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

  maxNodeWidth: 200, maxNodeHeight: 45,
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
      label = SharedData.labelsShorteningHelper.shortenLabel(node.data.source.element, app.isRuleShort, app.shorteningMethod);
    } else if (display === "textual") {
      label = node.data.source.nLElement;
    }

    node.width = label.length * APP_GLOBALS.fontCharacterWidth + 16;

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
    hierarchy.dy = app.proofWidth / (hierarchy.height + 1);
    let tree_layout;

    if (this.allowOverlap) {
      // tries to fit to screen 
      tree_layout = d3.tree()
        .size([app.proofWidth, app.proofHeight])
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

  update: function (source, drawTime = app.drawTime) {
    this.setNodeWidthsAndMax(this.hierarchy); 

    if (app.isLinear) {
      this.root = lP.computeLinearLayout(this.hierarchy);
    } else {
      this.root = this.computeTreeLayout(this.hierarchy);
    }

    this.drawTree(source, drawTime);

    // Add axiom buttons depending on the navigation mode (Normal vs Magic)
    if (app.isMagic) {
      let originalHierarchy = SharedData.createHierarchy(SharedData.edgeData);
      SharedData.updateHierarchyVars(originalHierarchy);
      this.magicNavigationHelper.entireProofHierarchy = originalHierarchy;
      this.magicNavigationHelper.addMagicNavButtonsToNodes();
    } else {
      this.axiomFunctionsHelper.addFunctionButtonsToNodes();
    }

    //add tooltips to rule names
    this.inferenceRulesHelper.addTooltipToNodes();

    //FIXME: Link button in magic mode does not work with the new root
    //add the link button
    this.linkFunctionsHelper.svg = app.svgProof;
    this.linkFunctionsHelper.sharedData = SharedData;

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

  drawTree: function (source, drawTime) {
    //remove on end functions from previous drawing
    this.removeMouseEvents();

    //remove the focus effect of the previous drawing
    this.showAll();

    // Create a transition for blending in the tree
    let t = app.svgProof.transition()
      .duration(drawTime)
      .on("start", () => {
        app.isDrawing = true;
      })
      .on("end", () => {
        this.addFocusFunctionality();
        app.isDrawing = false;
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
            .attr("transform", d => `translate(${d.x0}, ${app.proofHeight - parseInt(d.y0)})`)

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
                                .attr("transform", (d, i, n) => `translate(${stops[index].x}, ${app.proofHeight - parseInt(stops[index].y)})`)
                          } else {
                            return element
                                .transition()
                                .duration(drawTime)
                                .attr("transform", (d, i, n) => `translate(${stops[index].x}, ${app.proofHeight - parseInt(stops[index].y)})`)
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
            .attr("transform", (d, i, n) => `translate(${d.x}, ${app.proofHeight - parseInt(d.y)})`)
        },
        update => {
          update
            .transition(t)
            .attr("transform", d => `translate(${d.x}, ${app.proofHeight - parseInt(d.y)})`)
        },
        exit => {
          exit
            .transition(t).ease(d3.easeLinear).style("opacity", 0)
            .remove()
        }
      );
    // Draw links
    if (!app.isLinear) {
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
                (d.source.data.target.type === "axiom" && !app.isMagic ? " from-axiom " : "")
              )
              .attr("id", d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
              .attr("cursor", d => d.source.data.target.type === "axiom" ? "pointer" : "auto")
              .on("click", (_, d) => {
                if (!app.isMagic && d.source.data.target.type === "axiom") {
                  SharedData.linkFunctionsHelper.showSubTree(d.target);
                }
              })
              .attr("x1", d => d.target.x0)
              .attr("y1", d => app.proofHeight - d.target.y0 + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x0)
              .attr("y2", d => app.proofHeight - d.source.y0)
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
                                  .attr("y1", () => app.proofHeight - stops[index].y + nodeVisualsDefaults.BOX_HEIGHT)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => app.proofHeight - d.source.y)
                            } else if (stops[index + 1] && !stops[index].data.id.startsWith("MN")) {
                              return cat(index + 1)
                                  .transition()
                                  .duration(drawTime)
                                  .attr("x1", d => stops[index].x)
                                  .attr("y1", d => app.proofHeight - stops[index].y + nodeVisualsDefaults.BOX_HEIGHT)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => app.proofHeight - d.source.y)
                            } else {
                              return element
                                  .transition()
                                  .duration(10)
                                  .attr("opacity", 0)
                                  .transition()
                                  .duration(drawTime)
                                  .attr("x1", d => d.source.x)
                                  .attr("y1", d => app.proofHeight - d.source.y)
                                  .attr("x2", d => d.source.x)
                                  .attr("y2", d => app.proofHeight - d.source.y)
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
              .attr("y1", d => app.proofHeight - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x)
              .attr("y2", d => app.proofHeight - d.source.y);

            /*
            container.append("g")
                .attr("class", "edge-button")
                .attr('id', d => 'detachButtonN' + d.target.data.source.id)
                .attr("cursor", "pointer")
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${app.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${app.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })

            container
                .append("circle")
                .attr("cx", 0)
                .attr("cy", -8)
                .attr("r", 14)
                .attr("fill", "#ccc")
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${app.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${app.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })

            container
                .append("text")
                .attr('class', 'edgelabel material-icons')
                .style('font-size', '16px')
                .style('fill', 'white')
                .text('\ue14e')
                .attr("text-anchor", "middle")
                .on("click", d => {
                    SharedData.linkFunctionsHelper.showSubTree(d.target);
                })
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x0 + (s.x0 - t.x0) / 2}, ${app.proofHeight - t.y0 - 1.5 * (s.y0 - t.y0) / 2})`;
                })
                .transition(t)
                .attr("transform", d => {
                    const { source: s, target: t } = d;
                    return `translate(${t.x + (s.x - t.x) / 2}, ${app.proofHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
                })
            */
          },
          update => {
            update
              .transition(t)
              .attr("x1", d => d.target.x)
              .attr("y1", d => app.proofHeight - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
              .attr("x2", d => d.source.x)
              .attr("y2", d => app.proofHeight - d.source.y)
          },
          exit => {
            exit.remove()
          }
        );
    } else {
      lP.drawCurvedLinks(t);
    }

    if (!app.isLinear) {
      this.edgeData.forEach(function (link) {
        if (link.source.element === "Asserted Conclusion")
          d3.select("#N" + link.target.id).attr("class", "node axiom asserted");
        if (link.source.element === "Known")
          d3.select("#N" + link.source.id).attr("class", "node rule krule");
      });
    }

    this.nodeVisualsHelper.svg = app.svgProof;
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
    let originalHierarchy = this.createHierarchy(SharedData.edgeData);
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

    if (app.isMagic && someHierarchy !== this.hierarchy) {
      someHierarchy.descendants().forEach((d, i) => {
        d.x0 = magic ? parseInt(magic.x) : app.proofWidth / 2;
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
        d.x0 = app.proofWidth / 2;
        d.y0 = 0;
        d.id = i;
        d._children = d.children;
      });
    }
  },

  advancedUpdate: function (drawTime = app.drawTime) {
    this.update(drawTime);
  },

  separation: function (a, b) {
    return ((a.width + b.width) / 2) / this.maxNodeWidth + 0.03;
  }

}

function removeListeners(event, thingsWithListeners) {
  thingsWithListeners.forEach((val, key) => {
    if (!key) {
      delete thingsWithListeners[key]
    } else {
      key.removeEventListener(event, val);
    }
  });
}


export { APP_GLOBALS, SharedData, removeListeners };