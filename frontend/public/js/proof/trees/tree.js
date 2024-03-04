import { proof } from "../proof.js";
import { nodeVisualsDefaults } from "../node-visuals.js";
import { computeTreeLayout } from "../data/process-data.js";
import { utils as ruleUtils } from "../rules/rules.js";

export class TreeNavigation {

    constructor() {
        this._entireProofHierarchy = undefined;
    }

    hierarchy = undefined;
    nodes = undefined;
    links = undefined;
    buttons = undefined;
    axioms = undefined;
    rules = undefined;
    labels = undefined;
    root = undefined;
    edgeData = undefined;
    restOfProofNode = { id: "r0", element: "", type: "rest" }

    init(processedData) {
        let nodeData = processedData.nodes;
        let edgeData = processedData.edges;
      
        // add a custom link from the root node, needed for the stratify function
        edgeData.push({
          id: "L-1",
          source: nodeData.filter((x) => x.isRoot)[0],
          target: "",
        });

        //Store original data
        this.edgeData = edgeData;
      
        this.restart();
        this.update();
    }

    restart() { // this.edgeData must have been set 
        proof.svgRootLayer.selectAll("*").remove();
        this.hierarchy = this.createHierarchy(this.edgeData); 

        if (proof.isMagic) {
            this.hierarchy = this.createHierarchy(
                proof.magic.getInitialMagicalHierarchy(this.edgeData)
            );
        } else { // rules always shown in magic
            if (!proof.showRules) {
                this.hierarchy = this.createHierarchy(
                    this.flattenRules(this.edgeData)
                );
            } 
        }

        this.links = proof.svgRootLayer
            .append("g")
            .attr("id", "links")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        this.nodes = proof.svgRootLayer
            .append("g")
            .attr("id", "nodes");

        this.labels = proof.svg.selectAll("#nodes");
    }

    flattenRules() {
        const data = structuredClone(this.edgeData);
        const rules = {}, rts = {}, targets = []; 
        data.forEach(e => {
            if (ruleUtils.isRule(e.source.type)) {
                rules[e.source.id] = e;
                rts[e.target.id] = e;
            } else {
                targets.push(e)
            }
        })
        targets.forEach(t => {
            t.source.rule = rts[t.source.id].source;
            
            if (t.target !== "" && rules[t.target.id]) {
                t.target = rules[t.target.id].target; // replaces rule with rule target
            }
        })
        
        return targets;
    }

    update(reset = false) {
        if (reset) {
            this.restart();
        }

        const drawTime = proof.drawTime;
        proof.nodeVisuals.setNodeWidthsAndMax(this.hierarchy);
        this.root = computeTreeLayout(this.hierarchy);
        this.drawTree(drawTime);

        // add axiom buttons depending on the navigation mode (Normal vs Magic)
        if (proof.isMagic) {
            let originalHierarchy = this.createHierarchy(this.edgeData);
            proof.magic.entireProofHierarchy = originalHierarchy;
            proof.magic.addMagicNavButtonsToNodes();
        } else {
            proof.axioms.addFunctionButtonsToNodes();
        }

        // add tooltips to rule names
        proof.rules.addTooltipToNodes();
    }

    createHierarchy(data) {
        function updateHierarchyVars(someHierarchy, currentHierarchy) {
            if (!currentHierarchy) {
                currentHierarchy = someHierarchy; 
            }
            
            let common = [];
            let commonElement;
            
            someHierarchy.descendants().forEach(x => {
                commonElement = currentHierarchy.descendants().find(y => y.data.id === x.data.id);
                if (commonElement) {
                    common.push(commonElement);
                }
            });
    
            if (proof.isMagic && someHierarchy !== currentHierarchy) {
                someHierarchy.descendants().forEach((d, i) => {
                    let originalSource = common.find(x => x.data.target.id === d.data.source.id);
                    let originalTarget = common.find(x => x.data.source.id === d.data.source.id);
                    if (originalSource) {
                        d.id = originalSource.parent.id;
                    } else if (originalTarget) {
                        d.id = originalTarget.id;
                    }
                    d._children = d.children;
                });
            } else {
                someHierarchy.descendants().forEach((d, i) => {
                    d.id = i;
                    d._children = d.children;
                });
            }
        }

        const stratify = d3.stratify().id(d => d.source.id).parentId(d => d.target.id);
        const hierarchy = stratify(data); // conclusion is the root node, asserted axioms are the leaf nodes
        updateHierarchyVars(hierarchy, this.hierarchy);
        return hierarchy;
    }

    showAll() {
        d3.selectAll(".node").style("opacity", 1);
    }

    addFocusFunctionality() {
        this.nodes.selectAll("g").on('mouseover', function (d) {
            const nodes = proof.svg.selectAll(".node");
            nodes.sort((a, b) => (a.id === d.id) ? 1 : (b.id === d.id) ? -1 : 0);
        });
    }

    showSubTree(root) {
        //extract the current data
        let originalEdgeData = this.extractOriginalData(root);
        //reset all children to show the entire subtree, defined in axiomFunctions.js
        proof.axioms.resetAllChildren(root);
        //extract the data of the subtree
        let newEdgesData = this.extractData(root);
        //create a new hierarchy
        let newHierarchy = this.createHierarchy(newEdgesData);
        //preserve previous sub-structure
        let previousHierarchy = this.createHierarchy(originalEdgeData);
        let found;
        newHierarchy.children[0].descendants().forEach(x => {
            found = previousHierarchy.descendants().find(y => y.data.source.id === x.data.source.id);
            if (found && !found.children) {
                x.children = null;
            }
        });
        
        //update the graph
        this.hierarchy = newHierarchy;
        proof.nodeVisuals.initVarsAxiomFunctions();
        this.update();
    }

    extractOriginalData(root) {
        const data = [
            {
                id: "L-1",
                source: root.data.source,
                target: ""
            }
        ];

        root.links().forEach(entry => data.push(entry.target.data));
        return data;
    }

    extractData(root) {
        const data = [
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
    }

    lineAttributes(input) {
        return input
            .attr("marker-end", d => d.source.data.source.type === "rest" ? "" : "url(#arrowhead)")
            .attr("class", d =>
                (d.source.data.source.type === "rest" ? "link torest" : "link") +
                (d.source.data.target.type === "axiom" && !proof.isMagic ? " from-axiom " : "")
            )
            .attr("id", d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
            .attr("cursor", d => d.source.data.target.type === "axiom" ? "pointer" : "auto")
            .on("click", (_, d) => {
                if (!proof.isMagic && d.source.data.target.type === "axiom") {
                    proof.tree.showSubTree(d.target);
                }
            })
    }

    drawTree(drawTime) {
        //remove the focus effect of the previous drawing
        this.showAll();

        // Create a transition for blending in the tree
        let t = proof.svg.transition()
            .duration(drawTime)
            .on("start", () => {
                proof.isDrawing = true;
            })
            .on("end", () => {
                this.addFocusFunctionality();
                proof.isDrawing = false;
                document.dispatchEvent(new CustomEvent("drawend", { detail: { main: "proof-view" } }));
            });

        const root = this.root;
        
        function getInteractionSource() {
            let returnable = { id: root.data.source.id, x: root.x, y: root.y };
            if (proof.nodeInteracted) {
                if (proof.nodeInteracted.search) { // magic nodes
                    const selection = d3.select("#N"+proof.nodeInteracted.id)
                    const node = selection.data()[0];
                    if (node) {
                        returnable = { id: proof.nodeInteracted.id, x: node.x, y: node.y }
                    }
                } else {
                    returnable = { id: proof.nodeInteracted.data.source.id, x: proof.nodeInteracted.x, y: proof.nodeInteracted.y };
                }
            } 
            d3.select("#N"+returnable.id).raise();
            return returnable;
        }

        function transform(sn) {
            return `translate(${sn.x}, ${proof.height - parseInt(sn.y)})`;
        }

        // Add the data
        this.nodes.selectAll("g")
            .data(this.root.descendants(), d => "N" + d.data.source.id)
            .join(
                enter => {
                    enter.append("g")
                        .attr("class", d => proof.nodeVisuals.getNodeClass(d))
                        .attr("id", d => "N" + d.data.source.id)
                        // init on the source of interaction 
                        .attr("transform", transform(getInteractionSource()))
                        // move to destination (expand, pull)
                        .transition(t)
                        .attr("transform", d => transform(d))
                },
                update => {
                    update.transition(t)
                        .attr("transform", d => transform(d))
                },
                exit => {
                    // move nodes to source of interaction (collapse, push)
                    const transf = transform(getInteractionSource())
                    exit.transition(t)
                        .attr("transform", transf)
                        .style("opacity", 0)
                        .remove()
                }
            );

        const sn = getInteractionSource();
        // Draw links
        if (!proof.isLinear) {
            this.links.selectAll("line")
                .data(this.root.links(), d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
                .join(
                    enter => this.lineAttributes(enter.append("line"))
                            // init on the source node 
                            .attr("x1", _ => sn.x)
                            .attr("y1", _ => proof.height - sn.y)
                            .attr("x2", _ => sn.x)
                            .attr("y2", _ => proof.height - sn.y)
                            // move to destinations (expand, pull)
                            .transition(t)
                            .attr("x1", d => d.target.x)
                            .attr("y1", d => proof.height - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
                            .attr("x2", d => d.source.x)
                            .attr("y2", d => proof.height - d.source.y),
                    update => update.transition(t)
                            .attr("x1", d => d.target.x)
                            .attr("y1", d => proof.height - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
                            .attr("x2", d => d.source.x)
                            .attr("y2", d => proof.height - d.source.y),
                    exit => {
                        // return nodes to the source of the interaction (collapse, push)
                        exit.transition(t)
                            .attr("x1", _ => sn.x)
                            .attr("y1", _ => proof.height - sn.y)
                            .attr("x2", _ => sn.x)
                            .attr("y2", _ => proof.height - sn.y)
                            .style("opacity", 0)
                        exit.remove()
                    }
                );    
        } else {
            proof.linear.drawLinks(t, sn);
        }

        this.edgeData.forEach(link => {
            if (link.source.element === "Asserted Conclusion") {
                d3.select("#N" + link.target.id).attr("class", "node axiom asserted");
            }
            
            if (link.source.element === "Known") {
                d3.select("#N" + link.source.id).attr("class", "node rule krule");
            }
        });

        proof.nodeVisuals.renderNodes(proof.svg, this.nodes);
    }
}