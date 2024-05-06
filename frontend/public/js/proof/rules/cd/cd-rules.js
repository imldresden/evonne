import { LinearCD } from "./linear.js";
import { DifferenceCD } from "./diff.js";

function getIndexedData(data, type) {
    let current = -1;
    data.ops.forEach((op,i) => {
        if (op.id === data.current) {
            current = i
        }
    });
    const ops = data.ops;
    const indexed_data = {};

    ops.forEach((op, i) => {
        indexed_data[i] = op;
    });

    return { indexed_data, current };
}

function controls({ prevFn, currentFn, nextFn, replayFn }, where, params) {
    const buttons = where
        .append("div")
        .attr("class", "controls-bar");

    const lefted = buttons.append("a").attr("class", "bar-left");
    const centered = buttons.append("a").attr("class", "bar-center");
    const righted = buttons.append("a").attr("class", "bar-right");

    const complete = righted.append("a")
        .attr("class", "bar-button tooltipped")
        .attr("id", "entire-subproof")
        .attr("title", params.isSubProof?"Show Single Inference":"Show Entire Numerical Subproof");
    complete.append("i")
        .attr("class", "material-icons")
        .text(params.isSubProof?"unfold_less":"unfold_more")
        .style("font-size", "23px");

    const replay = righted.append("a")
        .attr("class", "bar-button")
        .attr("title", "Replay animation");
    replay.append("i")
        .attr("class", "material-icons")
        .text("replay")
        .style("font-size", "23px");
    //const centered = buttons.append("a").attr("class", "bar-center");

    const prev = lefted.append("a")
        .attr("class", "bar-button")
        .attr("title", "Previous Inference");
    prev.append("i")
        .attr("class", "material-icons")
        .text("skip_previous");

    const next = lefted.append("a")
        .attr("class", "bar-button")
        .attr("title", "Next Inference");
    next.append("i")
        .attr("class", "material-icons")
        .text("skip_next");

    prev.on("click", prevFn);
    next.on("click", nextFn);
    replay.on("click", replayFn);
}

function createVisContainer(params, where, extra = 0) {
    const exp = where
        .append("div").attr("class", "tooltiptext")
        .attr("id", "rowOperationTextSpan");

    //Add visualization
    where.append("div")
        .attr("class", "explanation-container")
        .attr("id", "explanation-container")
        .style("height", params.large ? `${params.p.height - (150 + extra)}px` : "200px")
        .style("width", "100%")

    return exp;
}

class CDRules {

    linear = new LinearCD();
    diff = new DifferenceCD();
    
    showObvious = false;

    draw({ ruleName, div, data, params }) {
        console.log({ ruleName, div, data, params });

        if (this.diff.isDifference(ruleName)) {
            this.diff.draw(data, ruleName, params, div);
        } else if (data) {
            this.linear.draw(data, ruleName, params, div);
        } else {
            console.error("unknown cd rule");
        }
    }
}

export { CDRules, getIndexedData, controls, createVisContainer }