import { proof } from "../proof.js";
import { nodeVisualsDefaults } from "../node-visuals.js";

export class LinearNavigation {
    constructor() {
        this._entireProofHierarchy = undefined;
    }

    isDistancePriority = true;

    computeLinearLayout(linearLayout, overlapAllowed) {
        let orderedElements = [];
        if (!this.isDistancePriority) {
            this.getDFOrder(linearLayout, orderedElements);
        } else {
            this.getBFOrder([linearLayout], orderedElements);
            orderedElements.push(linearLayout);
        }

        if (overlapAllowed) {
            const itemY = proof.height / (orderedElements.length < 2 ? 1 : orderedElements.length - 1);
            linearLayout.each(d => {
                d.x = 0.7 * proof.width - d.width / 2;
                if (orderedElements.length < 2) {
                    d.y = 0.01 * proof.height;
                } else {
                    d.y = 1.01 * proof.height - ((orderedElements.indexOf(d)) * itemY);
                }
            });    
        } else {
            const itemY = proof.nodeVisuals.maxNodeHeight * 1.2;
            const maxHeight = itemY * orderedElements.length;
            linearLayout.each(d => {
                d.x = 0.7 * proof.width - d.width / 2;
                d.y = maxHeight - ((orderedElements.indexOf(d)) * itemY);
            });
        }
        
        return linearLayout;
    }

    getDFOrder(hierarchy, orderedElements) {
        hierarchy.children?.forEach(d => {
            console.log(d)
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

    drawCurvedLinks(t, sourceNode) {
        proof.tree.links.selectAll("path")
            .data(proof.tree.root.links(), d => "L" + d.source.data.source.id + "*" + d.target.data.source.id)
            .join(
                enter => enter
                    .append("path")
                    .attr("marker-end", "url(#arrowhead)")
                    .attr("class", d => d.source.data.source.type === "rest" ? "link torest" : "link")
                    .attr("id", d => "L" + d.source.data.source.id + "*" + d.target.data.source.id)
                    .attr('d', d => this.position(d, sourceNode))
                    .transition(t)
                    .attr('d', d => this.position(d)),
                update => update
                    .transition(t)
                    .attr('d', d => this.position(d)),
                exit => {
                    exit.transition(t)
                        .attr('d', d => this.position(d, sourceNode))
                        .style("opacity", 0)
                    exit.remove()
                },
            );
    }

    position(d, zero) {
        const { BOX_HEIGHT } = nodeVisualsDefaults;
        //Note: "-0.01" was added to make the drawing works properly for the arrow of the highest node
        let x2, y2, x1, y1, targetX, targetY, sourceX, sourceY;
        if (zero) {
            targetX = zero.x;
            targetY = zero.y;
            sourceX = zero.x;
            sourceY = zero.y - 0.01;
        } else {
            targetX = d.target.x;
            targetY = d.target.y;
            sourceX = d.source.x;
            sourceY = d.source.y - 0.01;
        }
        x2 = targetX + .5 * d.target.width;
        y2 = proof.height - targetY + BOX_HEIGHT / 2;
        x1 = sourceX + .5 * d.source.width;
        y1 = proof.height - sourceY + BOX_HEIGHT / 2;

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