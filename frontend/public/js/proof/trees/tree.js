import { proof } from "../proof.js";
import { nodeVisualsDefaults } from "../node-visuals.js";
import { computeTreeLayout } from "../data/process-data.js";

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
      
        // initialize hierarchy depending on the navigation mode
        this.hierarchy = proof.isMagic
            ? this.createHierarchy(proof.magic.getInitialMagicalHierarchy(edgeData))
            : this.createHierarchy(edgeData);

        // update and draw the tree
        this.updateHierarchyVars(this.hierarchy);

        this.links = proof.svgRootLayer
            .append("g")
            .attr("id", "links")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        this.nodes = proof.svgRootLayer
            .append("g")
            .attr("id", "nodes");

        this.labels = proof.svg.selectAll("#nodes");
        this.update();
    }

    update(drawTime = proof.drawTime) {
        proof.nodeVisuals.setNodeWidthsAndMax(this.hierarchy);
        this.root = computeTreeLayout(this.hierarchy);
        this.drawTree(drawTime);

        // Add axiom buttons depending on the navigation mode (Normal vs Magic)
        if (proof.isMagic) {
            let originalHierarchy = this.createHierarchy(this.edgeData);
            this.updateHierarchyVars(originalHierarchy);
            proof.magic.entireProofHierarchy = originalHierarchy;
            proof.magic.addMagicNavButtonsToNodes();
        } else {
            proof.axioms.addFunctionButtonsToNodes();
        }

        // add tooltips to rule names
        proof.rules.addTooltipToNodes();
    }

    createHierarchy(data) {
        // Create the stratify function for our data
        let stratify = d3.stratify()
            .id(d => d.source.id)
            .parentId(d => d.target.id);

        // conclusion is the root node, asserted axioms are the leaf nodes
        return stratify(data);
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

    showRest(data) {
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
        this.updateHierarchyVars(newHierarchy);
        //preserve previous sub-structure
        let previousHierarchy = this.createHierarchy(originalEdgeData);
        this.updateHierarchyVars(previousHierarchy);
        let found;
        newHierarchy.children[0].descendants().forEach(x => {
            found = previousHierarchy.descendants().find(y => y.data.source.id === x.data.source.id);
            if (found && !found.children) {
                x.children = null;
            }
        });
        //update the graph
        this.updateHierarchy(newHierarchy);
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
        function getTransformSourceNode() {
            if (proof.nodeInteracted) {
                if (proof.nodeInteracted.search) { // magic nodes
                    const selection = d3.select("#N"+proof.nodeInteracted.id)
                    selection.raise();
                    const node = selection.data()[0];
                    if (!node) { // could not find the node based on id
                        d3.select("#N"+root.data.source.id).raise();
                        return root;
                    }
                    return node;
                } 
                d3.select("#N"+proof.nodeInteracted.data.source.id).raise();
                return proof.nodeInteracted;                   
            } 
            d3.select("#N"+root.data.source.id).raise();
            return root;
        }

        function getTransformToSource() {
            return `translate(${getTransformSourceNode().x}, ${proof.height - parseInt(getTransformSourceNode().y)})`
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
                        .attr("transform", getTransformToSource)
                        // move to destination (expand, pull)
                        .transition(t)
                        .attr("transform", d => `translate(${d.x}, ${proof.height - parseInt(d.y)})`)
                },
                update => {
                    update.transition(t)
                        .attr("transform", d => `translate(${d.x}, ${proof.height - parseInt(d.y)})`)
                },
                exit => {
                    // move nodes to source of interaction (collapse, push)
                    exit.transition(t)
                        .attr("transform", getTransformToSource)
                        .style("opacity", 0)
                        .remove()
                }
            );

        // Draw links
        if (!proof.isLinear) {
            const sn = getTransformSourceNode();
            this.links.selectAll("line")
                .data(this.root.links(), d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
                .join(
                    enter => {
                        enter.append("line")
                            .attr("marker-end", d => d.source.data.source.type === "rest" ? "" : "url(#arrowhead)")
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
                            .attr("y2", d => proof.height - d.source.y);
                    },
                    update => {
                        update.transition(t)
                            .attr("x1", d => d.target.x)
                            .attr("y1", d => proof.height - d.target.y + nodeVisualsDefaults.BOX_HEIGHT + 1)
                            .attr("x2", d => d.source.x)
                            .attr("y2", d => proof.height - d.source.y)
                    },
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
            this.edgeData.forEach(link => {
                if (link.source.element === "Asserted Conclusion") {
                    d3.select("#N" + link.target.id).attr("class", "node axiom asserted");
                }
                
                if (link.source.element === "Known") {
                    d3.select("#N" + link.source.id).attr("class", "node rule krule");
                }
            });
        } else {
            proof.linear.drawCurvedLinks(t);
        }

        proof.nodeVisuals.renderNodes(proof.svg, this.nodes);

        // Stash the old positions for transition.
        this.hierarchy.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    updateHierarchy(newHierarchy) {
        this.hierarchy = newHierarchy;
        proof.nodeVisuals.initVarsAxiomFunctions();
        this.update();
    }

    resetHierarchy() {
        let originalHierarchy = this.createHierarchy(this.edgeData);
        this.updateHierarchyVars(originalHierarchy)
        this.updateHierarchy(originalHierarchy);
    }

    updateHierarchyVars(someHierarchy, subRoot, action) {
        let common = [];
        let commonElement;
        let magic = proof.magic.getMagic(subRoot, action);
        someHierarchy.descendants().forEach(x => {
            commonElement = this.hierarchy.descendants().find(y => y.data.id === x.data.id);
            if (commonElement) {
                common.push(commonElement);
            }
        });

        if (proof.isMagic && someHierarchy !== this.hierarchy) {
            someHierarchy.descendants().forEach((d, i) => {
                d.x0 = magic ? parseInt(magic.x) : proof.width / 2;
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
                d.x0 = proof.width / 2;
                d.y0 = 0;
                d.id = i;
                d._children = d.children;
            });
        }
    }
}