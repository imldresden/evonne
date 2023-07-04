/**
 * Handles the interactions of the different selection modes
 */
import {SELECTION_NODES} from "./selection.js";
import {Area, DataPoint, Node} from "./datastructure.js";
import {Task, TASK_MANAGER} from "./taskmanager.js";
import {DRAW_MANAGER} from "./draw.js";

/**
 * Class that represent the events used in a selection mode
 */
class SelectionMode {


    /**
     * Constructor of a SelectionMode
     * @param {function}start function that is called when the selection process starts
     * @param {function}move function that is called when the user moves the mouse
     * @param {function}end function that is called when the selection process ends
     */
    constructor(start, move, end) {
        this.start = start;
        this.end = end;
        this.move = move;
    }
}

let rectangleSelectionArea;
let startPositionRectangleSelection;
let currentSelection = [];

const SELECTION_MODE_AREA_CLASS_NAME = "selection_mode_area"
let rectangleSelectionActive = false;

/**
 * Function that is called when the Rectangle Selection mode process starts
 */
function startSelectionRectangle() {
    d3.event.preventDefault();
    // Save the current selection to restore it when the selection task is undone
    currentSelection = SELECTION_NODES.copy();
    startPositionRectangleSelection = getCurrentPosition();
    d3.selectAll(SELECTION_MODE_AREA_CLASS_NAME);
    rectangleSelectionActive = true;
    rectangleSelectionArea = DRAW_MANAGER.visualisation.append("rect")
        .attr("x", startPositionRectangleSelection.x)
        .attr("y", startPositionRectangleSelection.y)
        .attr("class", SELECTION_MODE_AREA_CLASS_NAME)
        .attr("height", 0)
        .attr("width", 0)
    DRAW_MANAGER.svg.on("mousemove", moveSelectionRectangle);
}

/**
 * Get all selected nodes with in a rectangular area
 * @param {Area}area area of the rectangle
 * @returns {Node[]} list of all nodes inside the area
 */
function getSelectedNodes(area) {
    let selectedNodes = [];
    for (let node of DRAW_MANAGER.currentGraph.nodes) {
        if (node.insideGroup) continue;
        if (area.isInside(new DataPoint(node.x, node.y * -1))) {
            selectedNodes.push(node.element);
        }
    }
    return selectedNodes;
}

/**
 * function that is called when the user moves the mouse in rectangle selection mode
 */
function moveSelectionRectangle() {
    d3.event.preventDefault();
    let currentPosition = getCurrentPosition();

    let area = new Area(startPositionRectangleSelection, currentPosition);

    if (rectangleSelectionArea === undefined) return;
    rectangleSelectionArea
        .attr("x", area.x.min)
        // i store the point in a cartesian coordinate system, but the positions in d3 on the y-axis are pointing into the wrong direction
        // that's why I invert the y parameter
        .attr("y", area.y.max * -1);

    rectangleSelectionArea
        .attr("width", area.x.length())
        .attr("height", area.y.length());

    // highlight all currently selected nodes
    SELECTION_NODES.restore(getSelectedNodes(area));
}

/**
 * function that is called when the rectangle selection process ends
 */
function endSelectionRectangle() {
    d3.event.preventDefault();
    if (!rectangleSelectionActive) {
        return;
    }
    DRAW_MANAGER.svg.on("mousemove", null);
    rectangleSelectionActive = false;
    let currentPosition = getCurrentPosition();

    let selectedNodes = getSelectedNodes(new Area(currentPosition, startPositionRectangleSelection));

    let copy = currentSelection.copy();
    let execute = function () {
        SELECTION_NODES.restore(selectedNodes);
    }
    let undo = function () {
        SELECTION_NODES.restore(copy);
    }

    TASK_MANAGER.execute(new Task(undo, execute, "Selection Rectangle"));
    DRAW_MANAGER.labelNodes();

    startPositionRectangleSelection = undefined;
    rectangleSelectionArea.remove();
    rectangleSelectionArea = undefined;

}

/**
 * Get the current mouse position
 * @param {boolean}invert invert the y axis?
 * @returns {DataPoint} Position of the mouse
 */
function getCurrentPosition(invert = true) {
    let mouse = d3.mouse(DRAW_MANAGER.visualisation.node())
    // i expect a cartesian coordinate system, but the positions in d3 on the y-axis are pointing into the wrong direction
    // that's why I invert the second parameter
    return new DataPoint(mouse[0], mouse[1] * (invert ? -1 : 1));
}

/**
 * Class that represents a polygon
 */
class Polygon {

    constructor() {
        // first vertex
        this.start = undefined;
        // list of all vertices
        this.vertices = [];
    }

    /**
     * Add a vertex to the polygon
     * @param {DataPoint}point new point to be added (current mouse position)
     */
    add(point) {
        if (this.start === undefined) this.start = point;
        this.vertices.push(point);
    }

    /**
     * Checks if a point is inside of a polygon. {@see https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon}
     * @param point
     * @returns {boolean}
     */
    isInside(point) {
        const x = point.x;
        const y = point.y;

        let inside = false
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x,
                yi = this.vertices[i].y
            const xj = this.vertices[j].x,
                yj = this.vertices[j].y

            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
            if (intersect) inside = !inside
        }
        return inside;
    }

    /**
     * Convert the vertices to a string with a list of the vertices for a svg polygon
     * @returns {string} vertices for a svg polygon
     */
    buildPolygonForD3() {
        let strings = [];
        for (let point of this.vertices) {
            strings.push(point.x + "," + point.y);
        }
        strings.push(this.start.x + "," + this.start.y);
        return strings.join(" ");
    }
}

let polygon;
let count = 0;
let lassoSelectionArea;
let lassoSelectionActive = false;

/**
 * Function that is called when the lasso selection process starts
 */
function startSelectionLasso() {
    lassoSelectionActive = true;
    currentSelection = SELECTION_NODES.copy();
    SELECTION_NODES.clear();
    d3.event.preventDefault();
    polygon = new Polygon();
    polygon.add(getCurrentPosition(false));
    lassoSelectionArea = DRAW_MANAGER.visualisation.append("polygon")
        .attr("points", polygon.buildPolygonForD3())
        .attr("class", SELECTION_MODE_AREA_CLASS_NAME);
    DRAW_MANAGER.svg.on("mousemove", moveSelectionLasso);
}

/**
 * Get all Nodes that will be selected with a given polygon
 */
function getSelectedNodesLasso() {
    let selectedNodes = [];
    if (polygon === undefined || polygon.vertices.length < 3)
        return selectedNodes;

    for (let node of DRAW_MANAGER.currentGraph.nodes) {
        if (node.insideGroup) continue;
        if (polygon.isInside(node)) {
            selectedNodes.push(node.element);
        }
    }
    return selectedNodes;
}

/**
 * Function that is called when the user moves the mouse during the lasso selection process
 */
function moveSelectionLasso() {
    d3.event.preventDefault();
    count++;
    // Skip some positions for better performance
    if (count % 2 === 1) return;
    polygon.add(getCurrentPosition(false));
    lassoSelectionArea.attr("points", polygon.buildPolygonForD3());
    SELECTION_NODES.restore(getSelectedNodesLasso());
}

/**
 * Function that is called when the lasso selection process ends
 */
function endSelectionLasso() {
    if (!lassoSelectionActive) return;
    DRAW_MANAGER.labelNodes();
    d3.event.preventDefault();
    lassoSelectionArea.remove();
    lassoSelectionArea = null;
    lassoSelectionActive = false;
    DRAW_MANAGER.svg.on("mousemove", null);
    count = 0;
    let selectedNodes = getSelectedNodesLasso();
    let copy = currentSelection.copy();
    let execute = function () {
        SELECTION_NODES.restore(selectedNodes);
    }
    let undo = function () {
        SELECTION_NODES.restore(copy);
    }

    TASK_MANAGER.execute(new Task(undo, execute, "Selection Lasso"));

}

/**
 * Singleton object of the rectangle selection mode
 * @type {SelectionMode}
 */
const RECTANGLE_SELECTION_MODE = new SelectionMode(startSelectionRectangle, moveSelectionRectangle, endSelectionRectangle);
/**
 * Singleton object of the lasso selection mode
 * @type {SelectionMode}
 */
const LASSO_SELECTION_MODE = new SelectionMode(startSelectionLasso, moveSelectionLasso, endSelectionLasso);
/**
 * Singleton object of the single selection mode, where the user has only click interactions and no complex mouse movement process
 * @type {SelectionMode}
 */
const NORMAL_SELECTION_MODE = new SelectionMode(null, null, null);

export {RECTANGLE_SELECTION_MODE, LASSO_SELECTION_MODE, NORMAL_SELECTION_MODE, SelectionMode};