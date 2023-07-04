import {SetCollection} from "../euler/dataStructure.js"

/**
 * In this object we will store the colors of a set
 * All sets with the same name should have the same color
 * For that, when ever we discover a new set name, we add this name as key and set the value to the color of {@link colors} at the {@link colorIndex}
 */
const colorOfLabel = {
    " ": "#999999",
    "⊥": "#c2c2c2",
    "⊤": "#799c78",
    "UNION": "yellow",
    "RANGE": "orange",
    "DOMAIN": "blue",
    "INTERSECTION_PARENT": "grey"
};

/**
 * draw a collection of sets into the div with the id
 * @param {SetCollection}collection
 * @param {string}id
 */
function drawEulerDiagram(collection, id) {
    drawer.draw(collection, id);
    drawer.drawArrows(id);
    drawer.styleDiagram(collection, id);
}

class Coordinate {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
}

/**
 * class representing a arrow
 */
class Arrow {

    /**
     *
     * @param {Coordinate}from origin coordinate
     * @param {Coordinate}to destination coordinate
     * @param {number}id id of the arrow
     * @param {string}text label of the arrow
     * @param {boolean}dotted dotted arrow
     */
    constructor(from, to, id, text, dotted) {
        this.from = from;
        this.to = to;
        this.id = id;
        this.text = text;
        this.dotted = dotted;
    }
}

/**
 * Handles style and arrow of sets
 */
class Drawer {

    /**
     * @param {Array<String>}colors
     */
    constructor(colors) {

        /**
         * Will store the color list of configuration.json
         * @type {Array}
         */
        this.colors = colors;

        /**
         * Index of the next color of {@link Drawer#colors} for {@link colorOfLabel}
         * @type {number}
         */
        this.colorIndex = 0;
    }

    /**
     * Get all arrows which are part of the sets
     * @param {string}id id of the euler diagram
     */
    drawArrows(id) {

        let arrows = {};
        let textNodes = [];

        // go trough all paths and check if there is a set with a given arrow Id
        d3.select("#" + id).selectAll('path').each(function (d) {
            if (d.arrowId === undefined) return;

            // algorithm finds a arrowId
            // check if there is already a arrow with the given Id
            if (arrows[d.arrowId] === undefined) {
                // if not initialize one
                arrows[d.arrowId] = new Arrow(undefined, undefined, d.id, undefined, d.dotted);
            }

            textNodes.push(d3.select(this.parentNode).selectAll('text tspan').node());

            // calculate the bounding box the euler diagram to get the center point
            let boundingBox = d3.select(this).node().getBBox();

            // center of euler diagram
            let coordinates = new Coordinate(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);


            // check if its the origin or destination
            if (d.from) {
                // throw error if the origin is already set
                if (arrows[d.arrowId].from !== undefined) throw "IllegalState! Cant have two times a 'from' coordinate";
                arrows[d.arrowId].from = coordinates;
            } else {
                // throw error if the destination is already set
                if (arrows[d.arrowId].to !== undefined) throw "IllegalState! Cant have two times a 'from' coordinate";
                arrows[d.arrowId].to = coordinates;
                arrows[d.arrowId].text = d.text;
            }
        });

        // for all arrows that we found we want to draw a arrow
        for (let arrowId of Object.keys(arrows)) {
            let arrow = arrows[arrowId];

            // calculate the center for the position of the text
            const offsetXLeftLabel = textNodes[0].getComputedTextLength() / 2;
            const offsetXRightLabel = textNodes[1].getComputedTextLength() / 2;
            this.drawArrow(id, arrow, offsetXLeftLabel, offsetXRightLabel);
        }
    }

    /**
     * draw a specific arrow
     * @param {Arrow}arrow arrow which will be added
     * @param {string}id id of the div parent of the svg
     * @param {number}offsetXLeftLabel offset the arrow needs left to not intersect with a label
     * @param {number}offsetXRightLabel offset the arrow needs right to not intersect with a label
     */
    drawArrow(id, arrow, offsetXLeftLabel, offsetXRightLabel) {

        // add the top of the arrow to the svg
        let svgArrow = d3.selectAll("#" + id + " svg").append("svg:defs").append("svg:marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 0 12 12")
            .attr('refX', 6)
            .attr("refY", 6)
            .attr("markerWidth", 12)
            .attr("markerHeight", 12)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M2,2 L10,6 L2,10 L6,6 L2,2");

        let lengthArrowTip = svgArrow.node().getBBox().width;

        // remove by offset of the label of the euler diagram so the arrow doesnt intersect with it
        let visibilityOffset = 2;
        arrow.from.x += (offsetXLeftLabel + visibilityOffset);
        arrow.to.x -= (offsetXRightLabel + lengthArrowTip + visibilityOffset);

        // define edges
        let edges = [
            {
                source: arrow.from,
                target: arrow.to
            }
        ];

        // draw line along the edges
        let links = d3.selectAll("#" + id + " svg").selectAll("line.link")
            .data(edges)
            .enter().append("path")//append path
            .attr("class", "link")
            .attr("id", "test")
            .style("stroke", "#000")
            .attr('marker-end', () => "url(#arrow)")//attach the arrow from defs
            .style("stroke-width", 2);
        links.attr("d", (d) => "M" + d.source.x + "," + d.source.y + ", " + d.target.x + "," + d.target.y)

        // make the line dotted if it should be dotted
        if (arrow.dotted) {
            links.style("stroke-dasharray", ("3, 3"))
        }


        // Calculate the center of the arrow to place the label of the arrow
        // + offsetY from 5
        // + 5 so its nicely readable
        let centerOfArrow = {
            x: (arrow.to.x - arrow.from.x) / 2,
            y: (arrow.to.y - arrow.from.y) / 2 - 5
        }

        // add label to the arrow
        let text = d3.selectAll("#" + id + " svg").append("text");

        let textPath = text.append("textPath")
            .attr("xlink:href", "#test")
            .text(arrow.text);

        let offsetX = textPath.node().getComputedTextLength() / 2;
        d3.selectAll("#" + id + " svg text")
            .attr("x", centerOfArrow.x - offsetX)
            .attr("dy", centerOfArrow.y);

    }


    /**
     * recolor the diagrams
     * @param {SetCollection}collection
     * @param {string}id
     */
    styleDiagram(collection, id) {

        // go through all sets of our collection and check if there is a "new" set (= no color defined yet)
        for (let set of collection.sets) {
            if (set.sets.length === 1) {
                let label = set.sets[0];
                // when there is no color defined yet ...
                if (colorOfLabel[label] === undefined) {
                    // set a color and increment the colorIndex for the next set
                    colorOfLabel[label] = this.colors[this.colorIndex];
                    this.colorIndex++;
                    // if the index exceeds the limits of the color list reset the index
                    if (this.colorIndex >= this.colors.length) this.colorIndex = 0;
                }
            }
        }

        // go through all circle
        d3.select("#" + id).selectAll(".venn-circle").select("path")
            // if it is a intersection parent the opacity should be 0.1 (so it looks like "it doesnt" really exist)
            .style("fill-opacity", function (d) {
                if (d.intersectionParent) return 0.1;
                return 0.5;
            })
            // recolor the circle
            .style("fill", function (d) {
                if (d.intersectionParent) return colorOfLabel["INTERSECTION_PARENT"];
                if (d.isRange) return colorOfLabel["RANGE"];
                if (d.isDomain) return colorOfLabel["DOMAIN"];
                return colorOfLabel[d.sets[0]]
            });


        // make all text labels black
        d3.select("#" + id).selectAll("text").style("fill", "black")

        // recolor the intersections which should be highlighted
        d3.select("#" + id).selectAll(".venn-intersection").select("path").each(function (d) {
            if (d.intersection) {
                // add a black stroke, increase the opacity and make the intersection red
                d3.select(this).style("stroke", "black").style("fill-opacity", "0.4").style("fill", "red");
            }
        });
    }

    /**
     * Draw a set collection with venn.js
     * @param {SetCollection}collection collection which shall be drawn
     * @param id id of the current div
     */
    draw(collection, id) {
        let chart = venn.VennDiagram();
        d3.select("#" + id).datum(collection.sets).call(chart);
    }

}

/**
 * Drawer object to interact with outside of this file (to initialize the colors in euler.js)
 * @type {Drawer}
 */
const drawer = new Drawer([]);

export {drawer, drawEulerDiagram};