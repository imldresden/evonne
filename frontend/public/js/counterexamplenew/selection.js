import {DRAW_MANAGER, tick} from "./draw.js";
import {SEARCH_RESULT_ITEM_CLASS_NAME, SelectedTagItem} from "./tags.js";

/**
 * This file handles the selection data structure
 */

/**
 * Selection Data structure. it contains a list of all selected items. If this item is added AGAIN to this list, this item is instead removed
 * It is possible to import and export the current state of this selection
 */
class Selection {

    constructor() {
        this.listOfSelectedObjects = [];
        this.callback = function () {
            console.log("No callback function for selection");
        };
    }

    /**
     * toggles the selection of an object. if the tag is already selected it will get unselected.
     * If it is not selected yet it is selected after calling this function
     * @param {string}object object to be selected
     * @returns {boolean} object is now selected?
     */
    select(object) {
        let isAlreadySelected = this.isSelected(object);
        if (isAlreadySelected) {
            this.listOfSelectedObjects.removeObject(object);
        } else {
            this.listOfSelectedObjects.push(object);
        }
        this.callback();
        return !isAlreadySelected;
    }

    /**
     * Set a callback to an event when the selection changes.
     * @param {function}callback
     */
    setOnSelectionChangedListener(callback) {
        this.callback = callback;
    }

    /**
     * Check if an object is currently selected
     * @param {Object}object
     * @returns {boolean} is the given object currently selected
     */
    isSelected(object) {
        return this.listOfSelectedObjects.includes(object);
    }

    /**
     * Clears the current selection
     */
    clear() {
        this.listOfSelectedObjects = [];
        this.callback();
    }

    /**
     * Copies the current selection to dont overwrite the original list
     * @returns {string[]}
     */
    copy() {
        let currentSelectionState = [];
        for (let object of this.listOfSelectedObjects) {
            currentSelectionState.push(object);
        }
        return currentSelectionState;
    }

    /**
     * import an exported state {@link Selection#copy}
     * @param copiedList
     */
    restore(copiedList) {
        this.listOfSelectedObjects = copiedList;
        this.callback();
    }
}

/**
 * Extends the selection to store the mapped colors as described in the Großer Beleg
 */
class SelectionTags extends Selection {

    constructor() {
        super();
        this.colorMapping = {}
        this.register = function (label, color) {
            if (this.colorMapping[label] === undefined) {
                this.colorMapping[label] = color;
            }
        }
    }

}

/**
 * Singleton instance to handle selected nodes
 * @type {Selection}
 */
const SELECTION_NODES = new Selection();
/**
 * Singleton instance to handle selected tags
 * @type {Selection}
 */
const SELECTION_TAGS = new SelectionTags();

SELECTION_NODES.setOnSelectionChangedListener(function () {
    DRAW_MANAGER.colorNodes();
});


SELECTION_TAGS.setOnSelectionChangedListener(function () {

    let container = document.getElementById("counter-example-selected-tags-container");
    container.innerHTML = "";

    for (let tag of SELECTION_TAGS.listOfSelectedObjects) {
        container.append(new SelectedTagItem(tag).build());
    }

    // If the user reverts a task where he selected and item while the search result is visible
    // we have to change the styling of the selected tags as well
    for (let div of document.getElementsByClassName(SEARCH_RESULT_ITEM_CLASS_NAME)) {
        let isSelected = SELECTION_TAGS.isSelected(div.label);
        div.style.fontWeight = isSelected ? "bold" : "normal";
        div.style.color = isSelected ? SELECTION_TAGS.colorMapping[div.label] : "black";
    }
    DRAW_MANAGER.addLinks();
    DRAW_MANAGER.setInteractionListenersForGraph();
    DRAW_MANAGER.labelNodes();
    DRAW_MANAGER.highlightEdges();
    tick();
});



export {SELECTION_TAGS, SELECTION_NODES}