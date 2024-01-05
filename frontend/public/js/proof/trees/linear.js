import { proof } from "../proof.js";
import { nodeVisualsDefaults } from "../node-visuals.js";

export class LinearNavigation {
    constructor() {
        this._entireProofHierarchy = undefined;
    }

    isDistancePriority = true;

    computeLinearLayout(hierarchy) {
        // Layout and draw the tree
        hierarchy.dx = 50;
        hierarchy.dy = proof.width / (hierarchy.height + 1);

        let linearLayout = d3.tree().size([proof.width, proof.height])
            .separation((a, b) => (a.width + b.width) / 2)(hierarchy);

        let orderedElements = [];
        if (!this.isDistancePriority) {
            this.getDFOrder(linearLayout, orderedElements);
        } else {
            this.getBFOrder([linearLayout], orderedElements);
            orderedElements.push(linearLayout);
        }

        let itemY = proof.height / (orderedElements.length < 2 ? 1 : orderedElements.length - 1);
        linearLayout.each(d => {
            d.x = 0.7 * proof.width - d.width / 2;
            if (orderedElements.length < 2) {
                d.y = 0.01 * proof.height;
            } else {
                d.y = 1.01 * proof.height - ((orderedElements.indexOf(d)) * itemY);
            }
        });

        return linearLayout;
    }

    getDFOrder(hierarchy, orderedElements) {
        hierarchy.children?.forEach(d => {
            this.getDFOrder(d, orderedElements);
        });
        orderedElements.push(hierarchy);
    }

    getNodesAtLevel(nodePreviousLevel) {
        let result = [];
        nodePreviousLevel.forEach(e => {
            e.children?.forEach(d => {
                result.push(d);
            });
        });
        return result;
    }

    getBFOrder(hierarchy, orderedElements) {
        let nodesAtLevel = this.getNodesAtLevel(hierarchy);
        if (nodesAtLevel.length !== 0) {
            this.getBFOrder(nodesAtLevel, orderedElements);
        }
        nodesAtLevel.forEach(d => {
            orderedElements.push(d);
        });
    }

    drawCurvedLinks(t) {
        proof.tree.links.selectAll("path").remove()

        proof.tree.links.selectAll("path")
            .data(proof.tree.root.links(), d => "L" + d.source.data.source.id + "*" + d.target.data.source.id)
            .join(
                enter => enter.append("path")
                    .attr("marker-end", "url(#arrowhead)")
                    .attr("class", d => d.source.data.source.type === "rest" ? "link torest" : "link")
                    .attr("id", d => "L" + d.source.data.source.id + "*" + d.target.data.source.id)
                    .attr('d', d => this.position(d, true))
                    .call(enter =>
                        enter.transition(t)
                            .attr('d', d => this.position(d))
                    ),
                exit => exit.remove(),
            );
    }

    position(d, zero) {
        //Note: "-0.01" was added to make the drawing works properly for the arrow of the highest node
        let x2, y2, x1, y1, targetX, targetY, sourceX, sourceY;
        if (zero) {
            targetX = d.target.x0;
            targetY = d.target.y0;
            sourceX = d.source.x0;
            sourceY = d.source.y0 - 0.01;
        } else {
            targetX = d.target.x;
            targetY = d.target.y;
            sourceX = d.source.x;
            sourceY = d.source.y - 0.01;
        }
        x2 = targetX + .5 * d.target.width;
        y2 = proof.height - targetY + nodeVisualsDefaults.BOX_HEIGHT / 2;
        x1 = sourceX + .5 * d.source.width;
        y1 = proof.height - sourceY + nodeVisualsDefaults.BOX_HEIGHT / 2;

        let offset = Math.abs(y2 - y1) / 2;

        let midpoint_x = (x1 + x2) / 2;
        let midpoint_y = (y1 + y2) / 2;

        let dx = (x1 - x2);
        let dy = (y1 - y2);

        let normalise = Math.sqrt((dx * dx) + (dy * dy));

        let offSetX = midpoint_x + offset * (dy / normalise);
        let offSetY = midpoint_y - offset * (dx / normalise);

        return "M" + x2 + "," + y2 +
            "S" + offSetX + "," + offSetY +
            " " + x1 + "," + y1;
    }

    renderSideConnectorsByType() {
        let newClasses = undefined;
        let selection = undefined;
        let connector = undefined;

        //get axioms nodes
        let elements = proof.tree.nodes.selectAll(".node");
        //remove old connectors
        elements.selectAll(".connector").remove();
        //add new connectors
        elements.each(function (e) {
            selection = d3.select(this);
            let inferredUsing;
            selection.each(d => {
                inferredUsing = d.data.source.data.rule.label
            });

            if (inferredUsing === "Asserted Conclusion") {
                selection.attr("class", "node axiom asserted");
            }
            
            newClasses = ["connector"];
            if (selection.classed("conclusion")) {
                newClasses.push("conclusionConnector");
            } else if (selection.classed("asserted")) {
                newClasses.push("assertedAxiomConnector");
            } else {
                newClasses.push("inferredAxiomConnector");
            }

            connector = selection.append("circle");
            connector.attr("class", newClasses.join(" "));
            selection.select(".connector")
                .attr("cx", (d) => d.width / 2)
                .attr("cy", nodeVisualsDefaults.BOX_HEIGHT / 2)
                .attr("r", nodeVisualsDefaults.CONNECTOR_SIZE / 2)
        });

        // Draw the rest-of-proof node
        proof.tree.nodes
            .select(".rest")
            .append("circle")
            .attr("r", 10)
            .on("click", () => proof.tree.resetHierarchy());
    }

    highlightCurrentInference(currentNode) {

        let iDsToHighlight = [currentNode.data.source.id];
        if (currentNode.children) {
            currentNode.children.forEach(x => {
                iDsToHighlight.push(x.data.source.id);
            });
        }
        let dataS, dataT;

        proof.svg.selectAll("g.node,path.link").style("opacity", (d) => {
            if (d.source) {
                dataS = d.source.data;
                dataT = d.target.data;
            } else {
                dataS = dataT = d.data;
            }

            if (iDsToHighlight.includes(dataS.source.id) && iDsToHighlight.includes(dataT.source.id)) {
                return 1;
            }
            return .2;
        });
    }

    setFullOpacityToAll() {
        proof.svg.selectAll("g.node,path.link").style("opacity", 1);
    }
}