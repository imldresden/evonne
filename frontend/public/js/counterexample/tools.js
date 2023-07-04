/**
 * This file handles all the interaction techniques that the user has.
 */


import {Task, TASK_MANAGER} from "./taskmanager.js";
import {DATA_STRUCTURE} from "./datastructure.js";
import {SELECTION_NODES} from "./selection.js";
import {
    LASSO_SELECTION_MODE,
    NORMAL_SELECTION_MODE,
    RECTANGLE_SELECTION_MODE,
    SelectionMode
} from "./selectionModes.js";
import {DRAW_MANAGER, redraw, tick} from "./draw.js";


const SELECTION_MODE_RECTANGLE = "rectangle_selection_mode";
const SELECTION_MODE_LASSO = "lasso_selection_mode";
const SELECTION_MODE_NORMAL = "normal_selection_mode";

// Stores the current selected selection mode
let SELECTION_MODE = SELECTION_MODE_NORMAL;

// tool names
const TOOL_GROUP = "group";
const TOOL_UNDO = "undo";
const TOOL_REDO = "redo";
const TOOL_HIDE = "hide";
const TOOL_CLEAR_SELECTION = "clear_selection";
const TOOL_LASSO_SELECTION = "lasso_selection";
const TOOL_RECTANGLE_SELECTION = "rectangle_selection";
const TOOL_NORMAL_SELECTION = "normal_selection";
const TOOL_SHOW_HIDDEN_NODES = "show_hidden_nodes";
const TOOL_TOGGLE_SHORTENING_MODE = "toggle_shortening_mode";

/**
 * Executes a function that is stored with a one key
 */
class ToolsManager {

    constructor() {
        this.tools = {}
    }

    /**
     * Registers a new function
     * @param {String}title Message that is shown when the user hovers over the corresponding item in the toolbar
     * @param {String}key Key to access the function later
     * @param {function}tool Function to be execute
     * @param {String}buttonId Id of the button in the toolbar
     */
    register(title, key, tool, buttonId = undefined) {
        this.tools[key] = tool;
        if (buttonId !== undefined) {
            let button = document.getElementById(buttonId);
            button.onclick = function () {
                TOOL_MANAGER.execute(key);
            }
            button.title = title;
        }
    }

    /**
     * Executes a function based on the corresponding key.
     * @param {String}key {@link ToolsManager#register};
     */
    execute(key) {
        this.tools[key]();
    }
}

// Create Singleton Instance of the ToolManager
const TOOL_MANAGER = new ToolsManager();

// register undo to the toolbar
TOOL_MANAGER.register("Undo (CTRL + Z)", TOOL_UNDO, function () {
    TASK_MANAGER.undo();
}, TOOL_UNDO);

// register redo to the toolbar
TOOL_MANAGER.register("Redo (CTRL + Y)", TOOL_REDO, function () {
    TASK_MANAGER.redo();
}, TOOL_REDO);

// register grouping nodes to the toolbar
TOOL_MANAGER.register("Group (g)", TOOL_GROUP, function () {
    if (SELECTION_NODES.listOfSelectedObjects.length === 0) return;
    let name = prompt("Enter a name for the group:", "Group");
    if (name.length === 0) name = "Group";
    let group = DATA_STRUCTURE.buildGroup(name);
    let copy = SELECTION_NODES.copy();
    let execute = function () {
        DATA_STRUCTURE.originalData.add(group);
        SELECTION_NODES.clear();
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
    }
    let undo = function () {
        DATA_STRUCTURE.originalData.remove(group);
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
        SELECTION_NODES.restore(copy);
    }
    TASK_MANAGER.execute(new Task(undo, execute, "Grouping"));
}, TOOL_GROUP);

// register hiding nodes to the toolbar
TOOL_MANAGER.register("Hide (h)", TOOL_HIDE, function () {
    let selectedIds = SELECTION_NODES.copy();
    let currentSelection = DATA_STRUCTURE.getInvisibleNodes();
    let execute = function () {
        DATA_STRUCTURE.toggleVisibility(selectedIds, false);
        SELECTION_NODES.clear();
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
    }
    let undo = function () {
        DATA_STRUCTURE.toggleVisibility(selectedIds, true);
        DATA_STRUCTURE.toggleVisibility(currentSelection, false);
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
        SELECTION_NODES.restore(selectedIds);
    }
    TASK_MANAGER.execute(new Task(undo, execute, "Hide nodes"));
}, TOOL_HIDE);

// register clear selection to the toolbar
TOOL_MANAGER.register("Clear selection (c)", TOOL_CLEAR_SELECTION, function () {
    let selectedObjects = SELECTION_NODES.copy();
    if (selectedObjects.length === 0) return;
    let execute = function () {
        SELECTION_NODES.clear();
        DRAW_MANAGER.labelNodes();
    }
    let undo = function () {
        SELECTION_NODES.restore(selectedObjects);
        DRAW_MANAGER.labelNodes();
    }
    TASK_MANAGER.execute(new Task(undo, execute, "Clear Selection"));
}, TOOL_CLEAR_SELECTION);

/**
 * Changes the selection mode
 * @param {String}name name of the new selection mode
 * @param {SelectionMode}mode functions to be executed on certain events in this mode
 * @param {boolean}move Does the user has to move his mouse in this mode
 * @param {boolean}zoom Is the user allowed to zoom and pan in this mode
 */
function selectSelectionMode(name, mode, move = false, zoom = false) {
    SELECTION_MODE = name;
    if (!zoom) {
        DRAW_MANAGER.svg.select("#background").on("mousedown.zoom", null)
        DRAW_MANAGER.removeInteractionListener();
    }
    DRAW_MANAGER.svg.on("mousedown", mode.start);
    DRAW_MANAGER.svg.on("mouseleave", mode.end);
    DRAW_MANAGER.svg.on("mouseup", mode.end);
    if (move) {
        DRAW_MANAGER.svg.on("mousemove", mode.move)
    }
    if (zoom) {
        DRAW_MANAGER.svg.select("#background").call(d3.zoom().on("zoom", redraw))
        DRAW_MANAGER.setInteractionListenersForGraph();
    }
}

// register Rectangle Selection Mode
TOOL_MANAGER.register("Rectangle selection mode (r)", TOOL_RECTANGLE_SELECTION, function () {
    selectSelectionMode(SELECTION_MODE_RECTANGLE, RECTANGLE_SELECTION_MODE, false, false);
}, TOOL_RECTANGLE_SELECTION);

// register Lasso Selection Mode
TOOL_MANAGER.register("Lasso selection mode (l)", TOOL_LASSO_SELECTION, function () {
    selectSelectionMode(SELECTION_MODE_LASSO, LASSO_SELECTION_MODE, false, false);
}, TOOL_LASSO_SELECTION);

// register Single Selection Mode
TOOL_MANAGER.register("Single selection mode (n)", TOOL_NORMAL_SELECTION, function () {
    selectSelectionMode(SELECTION_MODE_NORMAL, NORMAL_SELECTION_MODE, true, true);
}, TOOL_NORMAL_SELECTION);

// register Show hidden nodes
TOOL_MANAGER.register("Show hidden nodes (s)", TOOL_SHOW_HIDDEN_NODES, function () {
    let execute = function () {
        DATA_STRUCTURE.showHiddenNodes = !DATA_STRUCTURE.showHiddenNodes;
        if (!DATA_STRUCTURE.showHiddenNodes) {
            for (let node of DATA_STRUCTURE.originalData.nodes) {
                node.ignoreVisibility = false;
            }
        }
        DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
    }
    TASK_MANAGER.execute(new Task(execute, execute, "Show Hidden Nodes"));
}, TOOL_SHOW_HIDDEN_NODES);

// register toggle shortening mode
TOOL_MANAGER.register("Toggle shortening mode (m)", TOOL_TOGGLE_SHORTENING_MODE, function () {
    let execute = function () {
        DATA_STRUCTURE.shorteningMode = !DATA_STRUCTURE.shorteningMode;
        DRAW_MANAGER.labelNodes();
        tick();
    }
    TASK_MANAGER.execute(new Task(execute, execute, "Toggle Shortening Mode"));
}, TOOL_TOGGLE_SHORTENING_MODE);

export {
    TOOL_MANAGER,
    TOOL_HIDE,
    TOOL_REDO,
    TOOL_NORMAL_SELECTION,
    TOOL_RECTANGLE_SELECTION,
    TOOL_CLEAR_SELECTION,
    TOOL_LASSO_SELECTION,
    TOOL_UNDO,
    TOOL_GROUP,
    TOOL_SHOW_HIDDEN_NODES,
    TOOL_TOGGLE_SHORTENING_MODE
};

