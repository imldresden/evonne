/**
 * Handles the drawing process of the diagram
 */

// Interaction events for edges
import {SELECTION_NODES, SELECTION_TAGS} from "./selection.js";
import {Task, TASK_MANAGER} from "./taskmanager.js";
import {DATA_STRUCTURE, GroupEdge, GroupNode, Edge, Group} from "./datastructure.js";
import {buildPopup, SUBSTRUCTURE_POP_UP_ID} from "./substructures.js";
import { colors, stylesheet } from "../../style/cy-style.js";
import { params } from "../layouts/cola.js";

let cy;
const svg = document.createElement("svg");
svg.id = "ontology-view"
document.getElementById("counter-example-view-svg").append(svg)
const container = document.getElementById("counter-example-view-svg");
container.innerHTML = "";

cy = cytoscape({
    container,
    style: stylesheet,
    layout: params,
    wheelSensitivity: 0.3
  });

/**
 * Highlight edge if the user hovers it
 * @param {Edge}edge
 */
const mouseOverEdge = function (edge) {
    d3.selectAll(".link").classed("hover_link", false);
    if (edge instanceof GroupEdge) return;
    d3.select(this).classed("hover_link", true);
    let tooltip = d3.select("#tooltip");
    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    tooltip.html(edge.getLabel())
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

/**
 * Remove highlighting of edge if the user moves the mouse to away
 */
const mouseLeaveEdge = function () {
    d3.selectAll(".link").classed("hover_link", false);
    d3.select("#tooltip").transition()
        .duration(200)
        .style("opacity", 0);
}

/**
 * Change state of the group
 * @param {Group}group
 */
const toggleVisibilityOfGroup = function (group) {
    let execute = function () {
        DATA_STRUCTURE.toggleVisibilityOfGroup(group.element);
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
    }
    TASK_MANAGER.execute(new Task(execute, execute, "Toggle state of group"))
}

const STROKE_WIDTH = 3;

/**
 * Highlighting node when hovering over it
  */
const mouseOverNode = function () {
    d3.selectAll(".nodeG").select(".node").attr("stroke-width", STROKE_WIDTH + "px");
    d3.select(this).select(".node").attr("stroke-width", (STROKE_WIDTH * 2) + "px");
}
/**
 * Select node when clicking on it
 */
const mouseClickNode = function (node) {
    let execute = function () {
        if (node.insideGroup) return;
        SELECTION_NODES.select(node.element);
        DRAW_MANAGER.labelNodes();
    }
    TASK_MANAGER.execute(new Task(execute, execute, "Select node with single selection mode"));
}

/**
 * remove Highlighting of node when not hovering over it
 */
const mouseLeaveNode = function () {
    d3.selectAll(".nodeG").select(".node").attr("stroke-width", STROKE_WIDTH + "px");
}

/**
 * redraw the scene with a new transformation (zooming and panning)! THIS IS NOT CLEARING THE SCENE
 */
const redraw = function () {
    DRAW_MANAGER.visualisation.attr("transform", d3.event.transform);
}

/**
 * Calculate source and target point of an edge
 * @param {Edge}d
 * @returns {{source: {contact: {x, y: number}, width: number, height: number}, target: {contact: {}, width: number, height: number}}}
 */
function getSourceAndTarget(d) {
    // Calculate point on box
    const {height: sHeight, width: sWidth} = DRAW_MANAGER.nodes
        .nodes()
        .find((node) => node.id === d.source.getSVGGroupId())
        .getBBox();
    const {height: tHeight, width: tWidth} = DRAW_MANAGER.nodes
        .nodes()
        .find((node) => node.id === d.target.getSVGGroupId())
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
        source: {height: sHeight, width: sWidth, contact: sCenter},
        target: {height: tHeight, width: tWidth, contact: tContact}
    };
}

/**
 * Function that is called when ever the positions of the nodes inside the diagram change
 * It is applying the new positions for the nodes/edges/groups
 */
const tick = function () {
    DRAW_MANAGER.nodes.attr("transform", (d) => `translate(${d.x}, ${d.y - d.height / 2 + BOX_PADDING / 2})`);
    DRAW_MANAGER.edges
        .each((edge) => {
            edge.link = getSourceAndTarget(edge);
            d3.select("#" + edge.getSvgGroupID())
                .selectAll(".link")
                .attr("x1", edge.link.source.contact.x)
                .attr("y1", edge.link.source.contact.y - edge.source.height / 2 + BOX_PADDING / 2)
                .attr("x2", edge.link.target.contact.x)
                .attr("y2", edge.link.target.contact.y - edge.target.height / 2 + BOX_PADDING / 2);
        })

    DRAW_MANAGER.groups.attr("transform", (d) => `translate(${d.bounds.x - BOX_PADDING / 2},${d.bounds.y - BOX_PADDING / 2})`);
    DRAW_MANAGER.groups.each((group) => {
        d3.select("#" + group.getSvgGroupId())
            .select("rect")
            .attr("x", -BOX_PADDING / 2)
            .attr("width", group.bounds.width() + 2 * BOX_PADDING)
            .attr("height", group.bounds.height() + 2 * BOX_PADDING);
        d3.select("#" + group.getSvgGroupId())
            .select("label")
    });

    if (DATA_STRUCTURE.debug) {
        DRAW_MANAGER.center.attr("x", (node) => node.x).attr("y", (node) => node.y)
        DRAW_MANAGER.topLeft.attr("x", (node) => node.bounds.X).attr("y", (node) => node.bounds.Y)
        DRAW_MANAGER.bottomRight.attr("x", (node) => node.bounds.x).attr("y", (node) => node.bounds.y)
    }

}

const WIDTH = 960;
const HEIGHT = 700;
const BOX_PADDING = 20;
const GAP_DASH_ARRAY = 30;

// colors used to represent the nodes
const COLOR_FILL_SELECTED = "hsl(0, 91%, 77%)";
const COLOR_FILL_GROUP = "hsl(205, 87%, 94%)";
const COLOR_FILL_INVISIBLE = "hsl(0,0%,96%)";
const COLOR_FILL_DEFAULT = "hsl(31, 87%, 94%)";
const COLOR_STROKE_SELECTED = "hsl(0, 90%, 62%)";
const COLOR_STROKE_GROUP = "hsl(207, 89%, 68%)";
const COLOR_STROKE_INVISIBLE = "hsl(60, 1%, 63%)";
const COLOR_STROKE_DEFAULT = "hsl(30, 89%, 68%)";

/**
 * Manages the Drawing Process
 */
class DrawManager {
    constructor() {
        // <g> container of the edges
        this.edges = undefined;
        // <g> container of the nodes
        this.nodes = undefined;
        // <g> container of the groups
        this.groups = undefined;
        this.d3cola = cola.d3adaptor(d3);
        //SVG where the scene will be drawn
        this.svg = d3.select("#counter-example-view-svg");

        this.initialize();
        // main container of the svg
        this.visualisation = this.svg.append("g");
        this.currentGraph = undefined;
    }

    /**
     * Initialize the scene
     */
    initialize() {
        this.svg.attr("pointer-events", "all");
        this.svg.append("rect")
            .attr("class", "background")
            .attr("id", "background")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
            .call(d3.zoom().on("zoom", redraw))
        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5L2,0')
            .attr('stroke-width', '0px')
            .attr('fill', "darkgrey");
        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow-highlight')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5L2,0')
            .attr('stroke-width', '0px')
            .attr('fill', "red");
    }

    /**
     * Draw a given Snapshot
     * @param {Snapshot}snapshot to be visualised
     */
    draw(snapshot) {
        this.clear();
        this.currentGraph = snapshot;

        this.groups = this.visualisation.selectAll(".groupG")
            .data(this.currentGraph.groups)
            .join("g")
            .classed("groupG", true)
            .attr("id", (group) => group.getSvgGroupId())
            .call(this.d3cola.drag);

        this.groups
            .append("rect")
            .classed("group", true)
            .attr("x", -170 / 2)
            .attr("y", 0)
            .attr("width", 170)
            .attr("height", 30);

        this.groups
            .append("g")
            .attr("class", "labelG")

        this.edges = this.visualisation.selectAll(".linkG")
            .data(this.currentGraph.edgesWithNodeObject)
            .join("g")
            .classed("linkG", true)
            .attr("id", (edge) => edge.getSvgGroupID())

        this.addLinks();

        this.nodes = this.visualisation.selectAll(".nodeG")
            .data(this.currentGraph.nodes)
            .join("g")
            .classed("nodeG", true)
            .attr("id", (node) => node.getSVGGroupId())
            .call(this.d3cola.drag)

        this.nodes
            .append("rect")
            .classed("node", true)
            .attr("x", -170 / 2)
            .attr("y", 0)
            .attr("width", 170)
            .attr("height", 30);

        this.nodes
            .append("g")
            .attr("class", "labelG")

        // If the debug mode is activated some additional information are displayed (Press J)
        if (DATA_STRUCTURE.debug) {
            this.center = this.visualisation.selectAll(".center")
                .data(this.currentGraph.nodes)
                .enter().append("rect")
                .attr("width", "10px")
                .attr("class", "center")
                .attr("height", "10px")

            this.topLeft = this.visualisation.selectAll(".center2")
                .data(this.currentGraph.nodes)
                .enter().append("rect")
                .attr("width", "10px")
                .attr("class", "center2")
                .attr("fill", "blue")
                .attr("height", "10px")
            this.bottomRight = this.visualisation.selectAll(".center3")
                .data(this.currentGraph.nodes)
                .enter().append("rect")
                .attr("width", "10px")
                .attr("class", "center3")
                .attr("fill", "red")
                .attr("height", "10px")
        }

        this.addIndicationHiddenNodes();
        this.labelGroups();
        this.colorNodes();
        this.addGroupButtons();
        this.labelNodes();
        this.highlightEdges();
        this.addExpandSigns();
        this.setInteractionListenersForGraph();
        this.setClickListener();


        // calculate the ideal positions of the nodes
        this.d3cola.avoidOverlaps(true)
            .convergenceThreshold(1e-3)
            .size([WIDTH, HEIGHT])
            .nodes(this.currentGraph.nodes)
            .groups(this.currentGraph.groups)
            .links(this.currentGraph.edgesWithNodeObject)
            .jaccardLinkLengths(1000)
        //this.d3cola.start(500, 100, 200, 50).on("tick", tick)
        this.d3cola.start(100, 0, 50, 50).on("tick", tick)
        //.on("end", routeEdges);
    }

    /**
     * add the actual <line>'s that represent the links
     */
    addLinks() {
        this.edges.each((edge) => {
            let linkG = d3.select("#" + edge.getSvgGroupID());
            let amountOfLinks = edge.getAmountOfLinesToDraw();
            if (amountOfLinks === edge.lastTime) return;
            if (edge instanceof GroupEdge) {
                linkG.append("line")
                    .attr("class", "link")
                    .classed("group_link", true);
                return;
            }

            linkG.selectAll(".link").remove();
            for (let i = 0; i < amountOfLinks; i++) {
                linkG.append("line")
                    .attr("class", "link")
                    .attr("id", edge.getLinkId(i));
            }
            edge.lastTime = amountOfLinks
        });
    }

    /**
     * Label the groups in the expanded state
     */
    labelGroups() {
        this.groups.each((group) => {
            let groupG = d3.select("#" + group.getSvgGroupId());
            let label = groupG.select(".labelG");
            label.append("text")
                .classed("label", true)
                .attr("fill", "black")
                .attr("x", 45)
                .attr("y", -5)
                .text(group.label);
        })
    }

    /**
     * Add an indication to the nodes, that a hidden node is connected to this node {@link Node#indicateHiddenNode}
     */
    addIndicationHiddenNodes() {
        this.nodes.each((node) => {
            if (!node.indicateHiddenNode) return
            let nodeG = d3.select("#" + node.getSVGGroupId());
            let indication = nodeG.append("g")
                .attr("class", "indication");
            indication.append("circle")
                .attr("cy", -10)
                .attr("r", 10)
                .attr("fill", COLOR_STROKE_DEFAULT)
            indication.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -3)
                .attr("font-size", "3px")
                .attr("class", "material-icons")
                .attr("cursor", "pointer")
                .attr("fill", "red")
                .attr("font-weight", "bold")
                .text("!")
            indication.on("click",
                function () {
                    let nodesFound = DRAW_MANAGER.currentGraph.searchGraph.searchReachableHiddenNodes(node.element);
                    let execute = function () {
                        for (let nodeO of DATA_STRUCTURE.originalData.nodes) {
                            if (nodesFound.includes(nodeO.element)) {
                                nodeO.ignoreVisibility = true;
                            }
                        }
                        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
                    }

                    let undo = function () {
                        for (let nodeO of DATA_STRUCTURE.originalData.nodes) {
                            if (nodesFound.includes(nodeO.element)) {
                                nodeO.ignoreVisibility = false;
                            }
                        }
                        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());

                    }
                    TASK_MANAGER.execute(new Task(undo, execute, "Show related hidden nodes"))
                })
        })
    }

    /**
     * Apply the correct color to the nodes
     */
    colorNodes() {
        let nodes = d3.selectAll(".nodeG");
        nodes.select(".labelG").attr("opacity", (node) => node.visible ? 1 : 0.5);

        nodes.select(".node")
            .attr("fill", (node) => {
                if (SELECTION_NODES.isSelected(node.element)) {
                    return COLOR_FILL_SELECTED;
                }
                if (node instanceof GroupNode) {
                    return COLOR_FILL_GROUP;
                }
                if (!node.visible) {
                    return COLOR_FILL_INVISIBLE;
                }
                return COLOR_FILL_DEFAULT;
            })
            .attr("stroke", (node) => {
                if (SELECTION_NODES.isSelected(node.element)) {
                    return COLOR_STROKE_SELECTED;
                }
                if (node instanceof GroupNode) {
                    return COLOR_STROKE_GROUP;
                }
                if (!node.visible) {
                    return COLOR_STROKE_INVISIBLE;
                }
                return COLOR_STROKE_DEFAULT;
            })
    }

    /**
     * Add the labels in a list to the node
     */
    labelNodes() {
        this.nodes.each((node) => {
            let nodeG = d3.select("#" + node.getSVGGroupId());
            let label = nodeG.select(".labelG");
            label.text("");

            let count = 0;
            for (let concept of node.getOrderedLabels()) {
                let isSelectedNode = SELECTION_NODES.isSelected(node.element);
                let isSelectedConcept = SELECTION_TAGS.isSelected(concept);
                let isImportantLabel = node.isImportantLabel(concept);
                let text = label.append("text")
                    .classed("label", true)
                    .attr("fill", isSelectedNode ? "white" : "black")
                    .attr("dy", (0.5 + count * 1.2) + "em")
                    .attr("x", 0)
                    .attr("font-style", isImportantLabel ? "italic" : "normal");

                if (DATA_STRUCTURE.shorteningMode
                    && count >= DATA_STRUCTURE.shorteningCount
                    && !isSelectedConcept
                    && !isImportantLabel
                    && !node.expandedLabel) {
                    text.text("...")
                        .attr("font-size", "20px")
                        .attr("dy", (count * 1.2) + "em")
                        .on("click", function () {
                            let execute = function () {
                                node.expandedLabel = !node.expandedLabel;
                                DRAW_MANAGER.labelNodes();
                            };
                            TASK_MANAGER.execute(new Task(execute, execute, "Ignoring for shortening mode for node " + node.element))
                        })
                    break;
                }

                text.attr("dy", (0.5 + count * 1.2) + "em");
                text.text(concept);
                if (isSelectedConcept) {
                    text.attr("fill", SELECTION_TAGS.colorMapping[concept])
                        .attr("font-weight", "bold")
                }

                count++;
            }
            label.attr("transform", `translate(${-label.node().getBBox().width / 2}, 13)`);
            let width = (label.node().getBBox().width + (2 * BOX_PADDING) / 2);
            let height = label.node().getBBox().height + BOX_PADDING;

            node.width = width;
            node.height = height;
            nodeG.select("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("x", -label.node().getBBox().width / 2 - BOX_PADDING / 2)
                .attr("y", -BOX_PADDING / 2);
        })
    }

    /**
     * Add Buttons to group in collapsed state
     */
    addExpandSigns() {
        this.nodes.each((node) => {
            if (!(node instanceof GroupNode)) return;
            let expandSign = d3.select("#" + node.getSVGGroupId()).append("g")
                .attr("class", "lock-sign");
            expandSign.append("circle")
                .attr("cy", -10)
                .attr("cx", node.width / 2)
                .attr("r", 10)
                .attr("fill", COLOR_STROKE_GROUP)
            expandSign.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -3)
                .attr("x", node.width / 2)
                .attr("font-size", "3px")
                .attr("class", "material-icons")
                .attr("cursor", "pointer")
                .text("+")
        })
    }

    /**
     * add buttons to the group in expanded state
     */
    addGroupButtons() {
        this.groups.each((group) => {
            let groupG = d3.select("#" + group.getSvgGroupId());
            let collapseSign = groupG.append("g")
                .attr("class", "collapse-sign")
                .attr("cursor", "pointer");
            collapseSign.append("circle")
                .attr("r", 10)
                .attr("cy", -15)
                .attr("fill", COLOR_STROKE_GROUP)
            collapseSign.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "3px")
                .attr("class", "material-icons")

                .attr("y", -9.5)
                .text("-")

            let deleteSign = groupG.append("g")
                .attr("class", "delete-sign")
                .attr("cursor", "pointer");
            deleteSign.append("circle")
                .attr("cx", 25)
                .attr("r", 10)
                .attr("cy", -15)
                .attr("fill", "red")
            deleteSign.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "3px")
                .attr("class", "material-icons")
                .attr("y", -9.5)
                .attr("x", 25)
                .text("x")
        })
    }

    /**
     * Highlight edges if a new role name is selected.
     */
    highlightEdges() {
        this.edges.each((edge) => {
            let edgeG = d3.select("#" + edge.getSvgGroupID());

            let selectedRoleNames = edge.getSelectedRoleNames();
            if (selectedRoleNames.length === 0) {
                edgeG.selectAll(".link").attr("stroke", "darkgrey")
                return;
            }

            if (selectedRoleNames.length === 1) {
                edgeG.selectAll(".link").attr("stroke", SELECTION_TAGS.colorMapping[selectedRoleNames[0]])
                return;
            }

            for (let i = 0; i < selectedRoleNames.length; i++) {
                let link = edgeG.select("#" + edge.getLinkId(i));
                link.attr("stroke", SELECTION_TAGS.colorMapping[selectedRoleNames[i]]);
                link.attr("stroke-dasharray", GAP_DASH_ARRAY + " " + ((selectedRoleNames.length - 1) * GAP_DASH_ARRAY))
                link.attr("stroke-dashoffset", i * GAP_DASH_ARRAY);
            }

            // get amount
            // offset 1. durchgang 0: 5, gap: 5 * anzahl;
        })

    }

    /**
     * clear the current scene
     */
    clear() {
        if (this.edges === undefined) return;
        this.edges.each((edge) => edge.lastTime = 0)
        this.edges.remove();
        this.nodes.remove();
        this.groups.remove();

        if (this.center !== undefined) {
            this.center.remove();
            this.topLeft.remove();
            this.bottomRight.remove();
        }
    }

    /**
     * add the interaction listener to the graph. They are removed during a selection process.
     */
    setInteractionListenersForGraph() {
        this.nodes.on("mouseover", mouseOverNode);
        this.nodes.on("mouseleave", mouseLeaveNode);
        this.edges.selectAll(".link").on("mouseover", mouseOverEdge);
        this.edges.selectAll(".link").on("mouseleave", mouseLeaveEdge);
    }

    /**
     * add the click listener to the graph. they are NOT removed during a selection process
     */
    setClickListener() {
        this.nodes.select(".node").on("click", mouseClickNode);
        this.nodes.select(".lock-sign").on("click", toggleVisibilityOfGroup)
        this.nodes.select(".node").on("dblclick", function (node) {
            let execute = function () {
                if (DATA_STRUCTURE.substructures[node.element] === undefined) {
                    alert("No substructure found for this node!");
                    return;
                }
                buildPopup(DATA_STRUCTURE.substructures[node.element])
                DRAW_MANAGER.draw(DATA_STRUCTURE.substructures[node.element]);
            }
            let undo = function () {
                document.getElementById(SUBSTRUCTURE_POP_UP_ID).remove();
                DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
            }

            TASK_MANAGER.execute(new Task(undo, execute, "Show important structure"));

        });

        this.groups.select(".collapse-sign").on("click", toggleVisibilityOfGroup);
        this.groups.select(".delete-sign").on("click", function (group) {
            let execute = function () {
                DATA_STRUCTURE.originalData.remove(group);
                DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
            }
            let undo = function () {
                DATA_STRUCTURE.originalData.add(group);
                DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
            }
            TASK_MANAGER.execute(new Task(undo, execute, "Remove group"));
        });
    }

    /**
     * remove the interaction listeners from the graph. this is done during a selection process
     */
    removeInteractionListener() {
        this.nodes.on("mouseover", null);
        this.nodes.on("mouseleave", null);

        this.edges.selectAll(".link").on("mouseover", null);
        this.edges.selectAll(".link").on("mouseleave", null);
        mouseLeaveNode();
        mouseLeaveEdge();
    }
}

const DRAW_MANAGER = new DrawManager();

export {DRAW_MANAGER, redraw, tick};