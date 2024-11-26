import { LinearCD } from "./linear/linear.js";
import { DifferenceCD } from "./diff/diff.js";
import { proof } from "../../../proof/proof.js";

function getIndexedData(data) {
    const indexed_data = {};
    let current = 0;
    data.ops.forEach((op,i) => {
        if (op.id === data.current) {
            current = i
        }
    });
    const ops = data.ops;

    ops.forEach((op, i) => {
        indexed_data[i] = op;
    });

    return { ops: indexed_data, current };
}

function combineSteps(data, name) {

    const keys = Object.keys(data.ops);
    if (keys.length === 1) {
        return data;
    } else {
        const d = { id: "combined", premises: [], name: `Subproof: ${name}` };
        const s = new Set();
        keys.forEach(id => {
            d.domain = data.ops[id].domain;
            data.ops[id].premises.forEach(p => {
                if (!s.has(p.id) && p.constraint._asserted) {
                    d.premises.push(p);
                    s.add(p.id);
                }
            });
        });
        d.conclusion = data.ops[keys.length - 1].conclusion;
        d.node = data.ops[keys.length - 1].node;
        
        return { ops: { 0: d }, current: 0 };
    }
}

function controls({ data }, where, params) {
    const buttons = where.append("div").attr("class", "controls-bar");
    const lefted = buttons.append("a").attr("class", "bar-left");
    const righted = buttons.append("a").attr("class", "bar-right");

    if (proof.showSubProofs) {
        const complete = righted.append("a")
            .attr("class", "bar-button tooltipped")
            .attr("id", "entire-subproof")
            .attr("title", params.isSubProof?"Show Single Inference":"Show Entire Numerical Subproof");
        complete.append("i")
            .attr("class", "material-icons")
            .text(params.isSubProof?"unfold_less":"unfold_more")
            .style("font-size", "23px");
        
        complete.on("click", (e, d) => {
            if (params.isSubProof) {
                params.isSubProof = false;
                params.nodes = [data.ops[data.current].node];
            } else {
                params.isSubProof = true;
                params.nodes = Object.values(data.ops).map(d => d.node);
            }
            proof.rules.openExplanation(params, params.nodes)
        });
    }
    
    const replay = righted.append("a")
        .attr("class", "bar-button")
        .attr("title", "Reset Explanation");
    replay.append("i")
        .attr("class", "material-icons")
        .text("replay")
        .style("font-size", "23px");

    if (!params.isSubProof) {
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

        
        prev.on("click", (e, d) => {
            data.current = Math.max(0, data.current - 1);
            proof.rules.openExplanation(params, [data.ops[data.current].node])
        });
        next.on("click", (e, d) => {
            data.current = Math.min(data.current + 1, Object.keys(data.ops).length - 1);
            proof.rules.openExplanation(params, [data.ops[data.current].node])
        });
    }

    replay.on("click", (e, d) => {
        proof.rules.openExplanation(params, params.nodes)
    });
    
    
}

function createVisContainer(params, where, extra = 0) {
    const exp = where.append("div").attr("class", "popoverText flexy");
    exp.html(`
        <div id='cd-left'></div>
        <div id='cd-divider'></div>
        <div id='cd-right'></div> 
    `);

    where.append("div")
        .attr("class", "explanation-probe")
        .attr("id", "explanation-probe")
        .html(`
            <div class="input-field flexy">
                <input id="var-input" type="number" step="0.01">
                <label for="var-input" class="active" id="var-input-desc"></label>
                &nbsp;
                <button class="btn-small btn-primary" id="play-with-var" title="See animation"><i class="material-icons">play_arrow</i></button>
            </div>
        `);

    //Add visualization
    where.append("div")
        .attr("class", "explanation-container")
        .attr("id", "explanation-container")
        .style("height", params.large ? `${params.p.height - (150 + extra)}px` : "350px")
        .style("width", "100%")


    return { input: d3.select('#cd-left'), output: d3.select('#cd-right'), };
}

class CDRules {

    linear = new LinearCD();
    diff = new DifferenceCD();
    
    draw({ div, data, params }) {

        let _data = getIndexedData(data);

        if (params.isSubProof) {
            _data = combineSteps(_data, params.subProof.name);
        }

        console.log(_data)

        if (this.diff.isDifference(_data)) { 
            this.diff.draw(_data, params, div);
        } else if (data) {
            this.linear.draw(_data, params, div);
        } else {
            console.error("unknown cd rule");
        }
    }
}

export { CDRules, getIndexedData, controls, createVisContainer }