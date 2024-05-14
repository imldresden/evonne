import { proof } from "../../proof/proof.js";
import { DLRules } from "./dl-rules.js";
import { CDRules } from "./cd/cd-rules.js";

let tooltip, div, params;

const rule_sets = {
    dl: new DLRules(),
    cd: new CDRules(),
}

document.addEventListener("destroy_explanation", () => proof.rules.destroyExplanation())

// https://www.w3schools.com/howto/howto_js_draggable.asp
function makeDraggable(elmnt, handle) {
    if (!handle) {
        return;
    }

    let x = 0, y = 0, clientX = 0, clientY = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        clientX = e.clientX;
        clientY = e.clientY;
        document.onmouseup = releaseDrag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        x = clientX - e.clientX;
        y = clientY - e.clientY;
        clientX = e.clientX;
        clientY = e.clientY;

        elmnt.style.top = (elmnt.offsetTop - y) + "px";
        elmnt.style.left = (elmnt.offsetLeft - x) + "px";
    }

    function releaseDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

const utils = {
    addTitle: function (text) {
        let title = div.append("header").attr("id", "tooltip-handle-bar")

        title.append("i")
            .attr("class", "material-icons right modal-button")
            .attr("title", "Close")
            .style("margin-right", "15px")
            .html("close")
            .on("click", () => proof.rules.destroyExplanation())

        title.append("i")
            .attr("class", "material-icons left modal-button")
            .attr("title", params.large ? "Minimize" : "Maximize")
            .attr("id", "enlarge-tooltip")
            .style("margin-left", "15px")
            .html(params.large ? "fullscreen_exit" : "fullscreen")
            .on("click", () => proof.rules.enlargeExplanation())

        title.append("h2")
            .attr("align", "center")
            .attr("id", "ruleName")
            .text(text);
    },

    addSeparator: function () {
        div.append("br");
        div.append("br");
    },

    addMidRule: function (lengths, _div) {
        const d = _div ? _div : div;
        d.append("hr").attr("class", "mid").attr("width", Math.min(div.node().getBoundingClientRect().width, this.getRuleLength(lengths)));
    },

    getRuleLength: function (lengths) {
        let length = 0;
        for (let i = 0; i < lengths.length; i++) {
            length += (lengths[i] * 10) + 40;
        }

        return length - 40;
    },

    isRule: function (type) {
        return type.includes("rule") || type.includes("Rule");
    },

    getColor: function(num){
        function hslToHex(h,s,l) {
            //From https://css-tricks.com/converting-color-spaces-in-javascript/

            s /= 100;
            l /= 100;

            let c = (1 - Math.abs(2 * l - 1)) * s,
                x = c * (1 - Math.abs((h / 60) % 2 - 1)),
                m = l - c/2,
                r = 0,
                g = 0,
                b = 0;

            if (0 <= h && h < 60) {
                r = c; g = x; b = 0;
            } else if (60 <= h && h < 120) {
                r = x; g = c; b = 0;
            } else if (120 <= h && h < 180) {
                r = 0; g = c; b = x;
            } else if (180 <= h && h < 240) {
                r = 0; g = x; b = c;
            } else if (240 <= h && h < 300) {
                r = x; g = 0; b = c;
            } else if (300 <= h && h < 360) {
                r = c; g = 0; b = x;
            }
            // Having obtained RGB, convert channels to hex
            r = Math.round((r + m) * 255).toString(16);
            g = Math.round((g + m) * 255).toString(16);
            b = Math.round((b + m) * 255).toString(16);

            // Prepend 0s, if necessary
            if (r.length === 1)
                r = "0" + r;
            if (g.length === 1)
                g = "0" + g;
            if (b.length === 1)
                b = "0" + b;

            return "#" + r + g + b;
        }

        const hue = num % 360;
        return hslToHex(hue,50,75);
    }
}

class RulesHelper {
    // private methods 
    #renderExplanation() {
        if (tooltip) { tooltip.remove(); }

        const event = params.event;
        const premises = params.premises;
        const conclusion = params.conclusion;
        const data = params.data;
        const sp = params.subProof;

        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip-explanation")
            .attr("id", "toolTipID");

        div = tooltip
            .append("div").attr("class", "tooltiptext")
            .attr("id", "explanationTextSpan");

        if (params.large) {
            const p = d3.select("#proof-view").node().getBoundingClientRect();
            params.p = p;

            d3.select("#toolTipID")
                .style("width", `${p.width}px`)
                .style("height", `${p.height}px`)
                .style("left", 0)
                .style("bottom", 0)
                .style("top", 0)
                .style("right", 0);
        }

        if (data.source.type === "rule" || data.source.type === "DLRule") {
            rule_sets.dl.draw({ div, premises, conclusion, params });
        } else if (data.source.type === "CDRule") {
            rule_sets.cd.draw({ div, data: sp, params });
        } else if (data.source.type === "mrule" || data.source.type === "krule") {
            return;
        } else {
            console.error(`unknown rule type: "${data.source.type}"`);
            return;
        }

        if (proof.ruleExplanationPosition === "mousePosition") {
            proof.rules.#setPositionRelativeToMouse(event)
        } else {
            tooltip.classed(proof.rules.#getPositionClass(proof.ruleExplanationPosition), true);
        }

        makeDraggable(document.getElementById("toolTipID"), document.getElementById("tooltip-handle-bar"));
    }

    #getPositionClass(ruleExplanationPosition) {
        if (ruleExplanationPosition === "rightBottom") {
            return "positionRB";
        } else if (ruleExplanationPosition === "rightTop") {
            return "positionRT";
        } else if (ruleExplanationPosition === "leftTop") {
            return "positionLT";
        }

        return "positionLB";
    }

    #setPositionRelativeToMouse(event) {
        let element = document.getElementById("explanationTextSpan");

        if (element) {
            let width = element.offsetWidth;
            let height = element.offsetHeight - 35;

            let x = event.clientX + width > proof.width
                ? proof.width - width
                : event.pageX;
            let y = event.clientY + height > proof.height
                ? proof.height - height
                : event.pageY;

            tooltip.style("left", x + "px").style("top", y + "px");
        }
    }

    #getSubProof(node) {
        const subproof = proof.tree.hierarchy.find(p => {
            const sp = p.data.source.subProof;
            return sp && sp !== "" && sp === node.source.subProof;
        });

        if (subproof) {
            let steps;
            if (proof.showRules) {
                steps = subproof.descendants()
                    .filter(d => d.data.source.type === node.source.type
                        && d.data.source.subProof === node.source.subProof
                    ).map(cd => {
                        const op = cd.data.source.data.op
                        op.name = cd.data.source.element;
                        op.node = cd;
                        return op;
                    }); // `cd.data.source.id` matches `cd.data.source.data.op.id`
            } else {
                steps = subproof.descendants()
                    .filter(d => d.data.source.rule.type === node.source.type
                        && d.data.source.rule.subProof === node.source.subProof
                    ).map(cd => {
                        const op = cd.data.source.rule.data.op;
                        op.name = cd.data.source.rule.element;
                        op.node = cd;
                        return op;
                    });
            }
            steps = steps.flat(1).reverse();

            return {
                name: node.source.subProof,
                current: node.source.id,
                ops: steps,
            };
        } else {
            console.warn("no subproof identified");
        }
    }

    #lastToolTipTriggerID = null;

    addTooltipToNodes() {
        let proofView = proof.svg;

        proofView.selectAll(".rule").each(x => {
            proofView.select("#N" + x.data.source.id).on("click", (event, node) => {// } 
                if (node.data.source.id !== proof.rules.#lastToolTipTriggerID) {
                    proof.rules.openExplanation({ event }, [node]);
                    proof.rules.#lastToolTipTriggerID = node.data.source.id;
                } else {
                    proof.rules.destroyExplanation();
                }
            });
        });
    }

    destroyExplanation() {
        if (tooltip) { tooltip.remove(); }

        proof.rules.#lastToolTipTriggerID = null;
        proof.nodeVisuals.setFullOpacityToAll();
        d3.selectAll("#H1 text").text("help_outline");
    }

    highlightNodes(nodes) {
        let premises = [];
        let iDsToHighlight = [];
        let data, conclusion, cnode = nodes[nodes.length - 1];
        if (proof.showRules) {
            data = cnode.data;
        } else {
            data = { source: cnode.data.source.rule };
        }

        nodes.forEach(node => {
            if (proof.showRules) {
                conclusion = proof.nodeVisuals.getLabel(node.parent.data.source);
                iDsToHighlight.push(node.parent.data.source.id, node.data.source.id); // axiom, rule
            } else {
                conclusion = proof.nodeVisuals.getLabel(node.data.source);
                iDsToHighlight.push(node.data.source.id); // axiom
            }

            if (node.children) {
                node.children.forEach(child => {
                    premises.push(proof.nodeVisuals.getLabel(child.data.source));
                    iDsToHighlight.push(child.data.source.id);
                });
            }
        });

        proof.nodeVisuals.changeOpacities(iDsToHighlight);

        return { data, premises, conclusion };
    }

    openExplanation(_params, nodes) {
        const { data, premises, conclusion } = this.highlightNodes(nodes);
        const ruleName = proof.nodeVisuals.getLabel(data.source);
        const subProof = proof.rules.#getSubProof(data);

        params = {
            event: _params.event,
            premises,
            conclusion,
            data: _params?.data ? _params.data : data,
            subProof,
            isSubProof: _params?.isSubProof || false,
            large: _params?.large || false,
            ruleName // source of explanation trigger
        };

        this.#renderExplanation();
    }

    enlargeExplanation() {
        if (params.large) {
            params.large = false;
            proof.rules.#renderExplanation();
        } else {
            params.large = true;
            proof.rules.#renderExplanation();
        }
    }
}

export { RulesHelper, utils };