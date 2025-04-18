import { proof } from "../proof.js";
import { computeTreeLayout } from "../data/process-data.js";
import { utils as ruleUtils } from "../rules/rules.js";

export class TreeNavigation {
    hierarchy = undefined;
    nodes = undefined;
    links = undefined;
    buttons = undefined;
    axioms = undefined;
    rules = undefined;
    labels = undefined;
    root = undefined;
    cuts = [];

    subProofBoxCounter = 0;
    subproofEdgeCounter = 0;

    // read-only variables 
    _edges = undefined;
    _entire = undefined;
    _restOfProofNode = { id: "r0", element: "", type: "rest" }
    
    init(data) {
        this._edges = data.edges;

        // add a custom link from the root node, needed for the stratify function
        this._edges.push({
            id: "L-1",
            source: Object.values(data.nodes).filter((x) => x.isRoot)[0],
            target: "",
        });

        this._entire = this.createHierarchy(this._edges);

        this.restart();
        this.update();
    }

    restart() { // this._edges must have been set 
        proof.svgRootLayer.selectAll("*").remove();
        const edges = this.hideEdges(this._edges);

        if (proof.isMagic) { // rules always shown in magic
            this.hierarchy = this.createHierarchy(
                proof.magic.getInitialMagicalHierarchy(edges)
            );
        } else {
            this.hierarchy = this.createHierarchy(edges);
        }

        this.cuts = []; 
        
        this.links = proof.svgRootLayer
            .append("g")
            .attr("id", "links")
            .attr("cursor", "pointer");

        this.nodes = proof.svgRootLayer
            .append("g")
            .attr("id", "nodes");

        this.labels = proof.svg.selectAll("#nodes");
    }

    hideEdges(edges) {
        let data = structuredClone(edges);
        
        if (!proof.showSubProofs) {
            data = this.hideSubProofs(data); 
        }

        if (!proof.showRules) {
            data = this.hideRules(data); 
        }
        return data;
    }

    hideRules(edges) {
        const rules = {}, rts = {}, targets = [];
        edges.forEach(e => {
            if (ruleUtils.isRule(e.source.type)) {
                rules[e.source.id] = e;
                rts[e.target.id] = e;
            } else {
                targets.push(e);
            }
        });

        targets.forEach(t => {
            if (rts[t.source.id]) {
                t.source.rule = rts[t.source.id].source; // copies the rule into the nodes that are made from it
                t.source.subProof = t.source.rule.subProof;    
            } else {
                console.log(t.source.labels.default)
            }

            if (t.target !== "" && rules[t.target.id]) {
                t.target = rules[t.target.id].target; // replaces rule with rule target
            }
        });

        return targets;
    }

    //Create a new edge with a fresh ID
	getNewEdge(source, target) {
		return {
			id: "SPE" + this.subproofEdgeCounter++,
			source,
			target,
		};
	}

	//Create a new magic rule with a fresh ID
	getNewSubProofBox(name, type) {
		return {
			id: "SP" + this.subProofBoxCounter++,
			element: name,
			type,
            subProof: name,
            premises: {}, 
            conclusion: undefined
		}
	}

    hideSubProofs(edges) {
        const subproofs = {}, result = [], clean = [];
        
        edges.forEach(e => {
            const s = e.source.subProof && e.source.subProof !== '';
            const t = e.target.subProof && e.target.subProof !== '';

            if (s) {
                if (!subproofs[e.source.subProof]) {
                    subproofs[e.source.subProof] = this.getNewSubProofBox(e.source.subProof, e.source.type);
                }

                if (!t) { // s and !t: edge from subproof to conclusion
                    subproofs[e.source.subProof].conclusion = e.target;
                    //result.push(this.getNewEdge(subproofs[e.source.subProof], e.target));
                } 
                // ignore s & t 
            } else if (t) { // t and !s: edge from premise to subproof
                if (!subproofs[e.target.subProof]) {
                    subproofs[e.target.subProof] = this.getNewSubProofBox(e.target.subProof, e.target.type);
                }

                if (subproofs[e.target.subProof].premises[e.source.element]) {
                    clean.push(e)
                } else {
                    subproofs[e.target.subProof].premises[e.source.element] = e.source;
                    // change e.source.element to e.source.id to keep duplicates
                }
                
                //result.push(this.getNewEdge(e.source, subproofs[e.target.subProof]));
            } else {
                result.push(e);
            }
        });

        Object.keys(subproofs).forEach(sp => {
            const premises = subproofs[sp].premises;
            const conclusion = subproofs[sp].conclusion;

            delete subproofs[sp].premises;
            delete subproofs[sp].conclusion;

            Object.values(premises).forEach(p => {
                result.push(this.getNewEdge(p, subproofs[sp]));
            });

            result.push(this.getNewEdge(subproofs[sp], conclusion));
        })
        
        // there can be duplicate branches after hiding subproofs...
        clean.forEach(c => {
            let current = c.source.id;
            while (current !== undefined) {
                const idx = result.findIndex(r => r.target.id === current);
                
                if (idx === -1) {
                    current = undefined;
                } else {
                    current = result.find(r => r.target.id === current).source.id
                    result.splice(idx,1);                    
                }
            }
        })

        return result;
    }

    update(reset = false) {
        if (reset) {
            this.restart();
        }
        
        proof.rules.destroyExplanation();
        proof.nodeVisuals.totalHeight = 0;
        proof.nodeVisuals.setNodeDimsAndMax(this.hierarchy);
        this.root = computeTreeLayout(this.hierarchy);

        if (!proof.isZoomPan) {
            proof.svg.attr("width", proof.nodeVisuals.maxNodeWidth + 100); 
            proof.svg.attr("height", Math.max(proof.svg.attr("height"), proof.nodeVisuals.totalHeight + 20)); 
        }

        this.drawTree(proof.drawTime);
        
        // add axiom buttons depending on the navigation mode (Normal vs Magic)
        if (proof.isMagic) {
            proof.magic.addMagicNavButtonsToNodes();
        } else {
            proof.axioms.addFunctionButtonsToNodes();
        }

        // add popovers to rules
        proof.rules.addPopoverToNodes();
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
        this.nodes.selectAll("g").on('mouseover', function (_, d) {
            const nodes = proof.svg.selectAll(".node");
            nodes.sort((a, b) => (a.id === d.id) ? 1 : (b.id === d.id) ? -1 : 0);
        });
    }

    showSubTree(root) {
        if (proof.isDrawing || root.data.id === "rest") {
			return;
		}
        //extract the current data
        let originalData = this.extractOriginalData(root);
        //reset all children to show the entire subtree, defined in axiomFunctions.js
        proof.axioms.resetAllChildren(root);
        //extract the data of the subtree
        let newData = this.extractData(root);
        //create a new hierarchy
        let newHierarchy = this.createHierarchy(newData);
        //preserve previous sub-structure
        let previousHierarchy = this.createHierarchy(originalData);
        let found;
        newHierarchy.children[0].descendants().forEach(x => {
            found = previousHierarchy.descendants().find(y => y.data.source.id === x.data.source.id);
            if (found && !found.children) {
                x.children = null;
            }
        });

        this.cuts.push(this.hierarchy);
        this.hierarchy = newHierarchy;
        this.update();
    }

    restoreFromSubProof() {
        if (proof.isDrawing) {
			return;
		}
        if (this.cuts.length > 0) {
            this.hierarchy = this.cuts.pop();
            this.update();
        }
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
                source: this._restOfProofNode,
                target: ""
            },
            {
                id: "rest",
                source: root.data.source,
                target: this._restOfProofNode
            }
        ];
        root.links().forEach(entry => data.push(entry.target.data));
        return data;
    }

    lineAttributes(input) {
        if (proof.isCompact) {
            input
                .attr("marker-end", "")
                .attr("class", d => `link cuttable dim ${(d.source.data.source.type === "rest" ? "torest" : "")
                } ${(d.source.data.target === "" || ruleUtils.isRule(d.source.data.target.type) ? " hidden " : "")
                }`)
        } else {
            input
                .attr("marker-end", d => d.source.data.source.type === "rest" ? "" : "url(#arrowhead)")
                .attr("class", d => `link ${(d.source.data.source.type === "rest" ? "torest" : "")
                } ${(d.source.data.target.type === "axiom" && !proof.isMagic ? "cuttable" : "")
                }`)
        }
        
        return input
            .attr("id", d => `L${d.source.data.source.id}*${d.target.data.source.id}`)
            .attr("cursor", d => d.source.data.target.type === "axiom" ? "pointer" : "auto")
            .on("click", (e, d) => {
                if (e.ctrlKey && !proof.isMagic && d.source.data.target.type === "axiom") {
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
                    const selection = d3.select("#N" + proof.nodeInteracted.id)
                    const node = selection.data()[0];
                    if (node) {
                        returnable = { id: proof.nodeInteracted.id, x: node.x, y: node.y }
                    }
                } else {
                    returnable = { id: proof.nodeInteracted.data.source.id, x: proof.nodeInteracted.x, y: proof.nodeInteracted.y };
                }
            }
            d3.select("#N" + returnable.id).raise();
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
                        .attr("y1", d => proof.height - d.target.y + d.target.height + 1)
                        .attr("x2", d => d.source.x)
                        .attr("y2", d => proof.height - d.source.y),
                    update => update.transition(t)
                        .attr("x1", d => d.target.x)
                        .attr("y1", d => proof.height - d.target.y + d.target.height + 1)
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

        this._edges.forEach(link => {
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