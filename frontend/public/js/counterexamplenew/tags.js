/**
 * This file handles the tags that are displayed below the search bar when the user highlights a label
 */

import {DATA_STRUCTURE} from "./datastructure.js";
import {SELECTION_TAGS} from "./selection.js";
import {Task, TASK_MANAGER} from "./taskmanager.js";
import {activateKeyPressListener, deactivateKeyPressListener} from "./shortcuts.js";
import {DRAW_MANAGER, tick} from "./draw.js";

const searchBar = document.getElementById("counter-example-search-bar-tags");
const searchResultContainer = document.getElementById("counter-example-search-result-container");

const SEARCH_RESULT_ITEM_CLASS_NAME = "counter-example-search-result-item";

/**
 * initialize the input listeners for the search bar
 */

function initializeSearchBar() {
    searchBar.addEventListener("input", onInputChanged);
    searchBar.addEventListener("focusin", function () {
        deactivateKeyPressListener();
    });
    searchBar.addEventListener("focusout", function () {
        activateKeyPressListener();
    })
}

/**
 * this function clears the current search results
 */
function clear() {
    searchBar.value = "";
    searchResultContainer.innerHTML = "";
}

/**
 * Function that is executed when the user types something into the search bar
 */
function onInputChanged() {
    let labelToSearch = this.value;
    if (labelToSearch.length === 0) {
        searchResultContainer.innerHTML = "";
        return;
    }
    let result = DATA_STRUCTURE.searchForLabels(labelToSearch);
    searchResultContainer.innerHTML = "";
    if (result.length === 0) {
        searchResultContainer.innerHTML = "No label found";
        return;
    }

    for (let label of result) {
        searchResultContainer.append(new SearchResultItem(label).div);
    }
}

/**
 * Class that Represents a Search result item which will be displayed in the list of search results
 */
class SearchResultItem {

    /**
     *
     * @param {string}label Label that matches the entered text of the user
     */
    constructor(label) {
        this.div = document.createElement("div");
        this.div.innerText = label;
        this.div.className = SEARCH_RESULT_ITEM_CLASS_NAME;
        let isSelected = SELECTION_TAGS.isSelected(label);
        this.div.style.fontWeight = isSelected ? "bold" : "normal";
        this.div.style.color = isSelected ? SELECTION_TAGS.colorMapping[label] : "black";
        this.div.label = label;
        this.div.onclick = function () {
            clear();
            let execute = function () {
                SELECTION_TAGS.register(label, getColor());
                SELECTION_TAGS.select(label);
            }
            let selectionTask = new Task(execute, execute, "Highlight " + label);
            TASK_MANAGER.execute(selectionTask);
        }
    }
}
/**
 * Class that Represents a selected label item which will be displayed in form of a tag below the search bar
 */
class SelectedTagItem {
    /**
     *
     * @param {string}label selected label
     */
    constructor(label) {
        this.div = document.createElement("div");
        this.div.style.display = "inline-block";
        this.div.style.margin = "2px";
        this.remove = document.createElement("button");
        this.remove.innerText = "x"
        this.remove.onclick = function () {
            let execute = function () {
                SELECTION_TAGS.select(label);
                tick();
            }
            let selectionTask = new Task(execute, execute, "Remove highlight of " + label);
            TASK_MANAGER.execute(selectionTask);
        }

        this.colorpicker = document.createElement("input");
        this.colorpicker.type = "color";
        this.colorpicker.value = SELECTION_TAGS.colorMapping[label];

        let _refDiv = this;
        this.colorpicker.addEventListener('input', function() {
            let currentColor = SELECTION_TAGS.colorMapping[label];
            let _ref = this;
            let execute = function () {
                SELECTION_TAGS.colorMapping[label] = _ref.value;
                _refDiv.div.style.backgroundColor = _ref.value;
                DRAW_MANAGER.highlightEdges();
                DRAW_MANAGER.labelNodes();
            }
            let undo = function () {
                SELECTION_TAGS.colorMapping[label] = currentColor;
                _ref.value = currentColor;
                _refDiv.div.style.backgroundColor = currentColor;
                DRAW_MANAGER.highlightEdges();
                DRAW_MANAGER.labelNodes();
            }
            TASK_MANAGER.execute(new Task(undo, execute, "Change color of " + label))
        });

        this.div.append(this.remove);

        let span = document.createElement("span");
        span.innerText = label;

        this.div.append(this.colorpicker);
        this.div.append(span);
        this.div.style.backgroundColor = SELECTION_TAGS.colorMapping[label];
        this.div.className = "counter-example-selected-tag-item";
    }

    /**
     * get the div to be displayed
     * @returns {HTMLDivElement}
     */
    build() {
        return this.div;
    }
}

/**
 * Pointer variable for {@link colors}
 * @type {number}
 */
let currentColorIndex = -1;

/**
 * Colors that the user has to highlight labels
 * @type {string[]}
 */
const colors = [
    "#a52a2a",
    "#008080",
    "#00008b",
    "#ffd700",
    "#c71585",
    "#ff0000",
    "#00bfff",
    "#ff8c00",
    "#3cb371",
    "#00ff7f",
    "#4169e1",
    "#0000ff",
    "#adff2f",
    "#ff00ff",
    "#f0e68c",
    "#dda0dd",
    "#808000",
    "#ffa07a"
]

/**
 * get the next color for a new selected label
 * @returns {string}
 */
const getColor = function () {
    currentColorIndex++;
    let index = currentColorIndex % colors.length;
    return colors[index];
}


export {initializeSearchBar, SelectedTagItem, SEARCH_RESULT_ITEM_CLASS_NAME};