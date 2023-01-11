import {readFiles} from "./fileReader.js";
import {DATA_STRUCTURE} from "./datastructure.js";
import {activateKeyPressListener} from "./shortcuts.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import {initializeSearchBar} from "./tags.js";
import {DRAW_MANAGER} from "./draw.js";

Array.prototype.removeObject = function (object) {
    let index = this.indexOf(object);
    if (index > -1) {
        this.splice(index, 1);
    }
}

Array.prototype.copy = function () {
    let copy = [];
    for (let content of this) {
        copy.push(content);
    }
    return copy;
}

Array.prototype.pushIfNotExist = function (object) {
    if (this.includes(object)) return;
    this.push(object);
}

d3.select("body").append("div")
    .attr("class", "tooltip")
    .attr("id", "tooltip")
    .style("opacity", 0);

activateKeyPressListener();
initializeSearchBar();

await readFiles();
thumbnailViewer({mainViewId: "counter-example-view-svg", containerSelector: "#counter-example-container"});

DRAW_MANAGER.draw(DATA_STRUCTURE.originalData);


