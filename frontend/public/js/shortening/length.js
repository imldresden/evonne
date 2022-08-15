import { SharedData } from "../sharedData";

export class LengthBasedShorteningFunctions {
    constructor() {
    }

    shortenAllLabels() {
        // Get all the nodes for a certain depth to then shorten the labels depending on the neighbors
        this.nodesAtDepth = {};
        SharedData.hierarchy.each(d => {
            if (this.nodesAtDepth[d.depth] == null)
                this.nodesAtDepth[d.depth] = [];

            this.nodesAtDepth[d.depth].push(d);
        });

        // Shorten labels if they are too close to another node
        SharedData.labels.selectAll("text")
            .each(d => {
                // Get closest neighbor to the right and the distance to it
                let closestRightNeighbor = null;
                let distanceToClosestRightNeighbor = Infinity;

                let nodesAtDepth = [];
                if (this.nodesAtDepth[d.depth] != null) {
                    nodesAtDepth = this.nodesAtDepth[d.depth];
                }

                nodesAtDepth.forEach(neighborNode => {
                    if (neighborNode === d) return;

                    let distanceToNeighbor = neighborNode.x - d.x;

                    if (distanceToNeighbor > 0 && distanceToNeighbor < distanceToClosestRightNeighbor) {
                        closestRightNeighbor = neighborNode;
                        distanceToClosestRightNeighbor = distanceToNeighbor;
                    }

                })
                if (closestRightNeighbor != null) {
                    d.closest_right_neighbor = closestRightNeighbor;
                    d.distance_to_closest_right_neighbor = distanceToClosestRightNeighbor;
                }
            })
            .text((d, i, n) => {
                let BBox = n[i].getBBox();
                if (d.distance_to_closest_right_neighbor && d.distance_to_closest_right_neighbor <= 1.2 * BBox.width) {
                    let shortened = this.truncateText(n[i], d.data.source.element, 0.8 * d.distance_to_closest_right_neighbor);
                    d.data.source.element_short = shortened;
                    return shortened;
                } else {
                    d.data.source.element_short = null;
                    return d.data.source.element;
                }
            });
    }

    truncateText(t, text, space) {
        // make sure it is a string
        text = String(text)
        let originalText = text;
        // get space it takes up
        t = d3.select(t);
        let rect = t.node().getBoundingClientRect()
        // var rect = t.getBBox();

        while (Math.max(rect.width, rect.height) > space) {
            text = text.slice(0, text.length - 1);
            t.text(text + "...");
            rect = t.node().getBoundingClientRect()
            // rect = t.getBBox()
            if (text.length === 0) break
        }

        return text === originalText ? originalText : text + "..."
    }
}