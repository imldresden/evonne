import { proof } from "../../proof/proof.js";
import { DLRules } from "./dl-rules.js";
import { CDRules } from "./cd/cd-rules.js";

let popover, div, params;

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

const measure = {};

const utils = {
    addTitle: function (text) {
        let title = div.append("header").attr("id", "popover-handle-bar")

        title.append("i")
            .attr("class", "material-icons right modal-button")
            .attr("title", "Close")
            .style("margin-right", "15px")
            .html("close")
            .on("click", () => proof.rules.destroyExplanation())

        title.append("i")
            .attr("class", "material-icons left modal-button")
            .attr("title", params.large ? "Minimize" : "Maximize")
            .attr("id", "enlarge-popover")
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

    addMidRule: function (lengths, _div, id) {
        const d = _div ? _div : div;
        const hr = d.append("hr").attr("class", "mid");
        if(id) {
            hr.attr('id', id);
        }
        hr.attr("width", Math.min(div.node().getBoundingClientRect().width, this.getRuleLength(lengths)));
        return hr;
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

    getColor: function(h,s,l){
        const hue = h % 360;
        return `hsl(${hue},${s}%,${l}%)`;
    },

    getColors: function(total) {
        let colors = [];
        // hsl(174, 45%, 43%) is equivalent to --color-teal-darker in colors.css
        let hue = 174, saturation = 45, lightness = 43;
        for(let i = 0; i < total; i++){
            colors.push(utils.getColor(hue, saturation, lightness));
            hue+=80;
        }
        return colors;
    },

    setMeasure() {
        if (performance && performance.memory) {
            measure.memory = performance.memory.usedJSHeapSize; 
            measure.timeStamp = console.time();
        }
    },

    
    showMeasure() {
        // https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
        function fileSizeIEC(bytes) {
            if (bytes === 0) {
                return `0B`;
            }
            const exponent = Math.floor(Math.log(bytes) / Math.log(1024.0))
            const decimal = (bytes / Math.pow(1024.0, exponent)).toFixed(exponent ? 2 : 0)
            return `${decimal} ${exponent ? `${'kMGTPEZY'[exponent - 1]}iB` : 'B'}`
        }
    
        if (performance && performance.memory) {
            const end = {};
            end.memory = performance.memory.usedJSHeapSize;
            console.log("used heap size:")
            console.log(`${fileSizeIEC(end.memory - measure.memory)}`)
            console.log("time spent:")
            console.timeEnd()
        }
    }
}

class RulesHelper {
    // private methods 
    #renderExplanation() {
        if (popover) { popover.remove(); }

        const event = params.event;
        const premises = params.premises;
        const conclusion = params.conclusion;
        const data = params.data;
        const sp = params.subProof;

        popover = d3.select("body")
            .append("div")
            .attr("class", "explanation-popover")
            .attr("id", "explanation-popover-ID");

        div = popover
            .append("div").attr("class", "popoverText")
            .attr("id", "explanationTextSpan");

        if (params.large) {
            const p = d3.select("#proof-view").node().getBoundingClientRect();
            params.p = p;

            d3.select("#explanation-popover-ID")
                .style("width", `${p.width}px`)
                .style("height", `${p.height}px`)
                .style("left", 0)
                .style("bottom", 0)
                .style("top", 0)
                .style("right", 0);
        }

        if (data.source.type === "rule" || data.source.type === "DLRule") {
            const alternativeRuleName = params.ruleName;
            const originalRuleName = proof.ruleNameMapHelper.getOriginalName(alternativeRuleName);
            rule_sets.dl.draw({ div, premises, conclusion, alternativeRuleName, originalRuleName });
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
            popover.classed(proof.rules.#getPositionClass(proof.ruleExplanationPosition), true);
        }

        makeDraggable(document.getElementById("explanation-popover-ID"), document.getElementById("popover-handle-bar"));
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

            popover.style("left", x + "px").style("top", y + "px");
        }
    }

    #getSubProof(node) {
        const spID = node.source.subProof;
        
        const subproof = proof.tree._entire.find(p => {
            const sp = p.data.source.subProof;
            return sp && sp !== "" && sp === spID;
        });

        if (subproof) {
            let steps = subproof.descendants()
                .filter(d => utils.isRule(d.data.source.type)
                    && d.data.source.subProof === spID
                ).map(cd => {
                    const source = cd.data.source;
                    const op = source.data.op;
                    op.name = source.element;
                    op.node = cd;
                    
                    return op;
                }); // `cd.data.source.id` matches `cd.data.source.data.op.id`
            steps = steps.flat(1).reverse();

            return {
                name: spID,
                current: node.source.id,
                ops: steps,
            };
        }
    }

    #lastPopoverTriggerID = null;

    addPopoverToNodes() {
        let proofView = proof.svg;

        proofView.selectAll(".rule").each(x => {
            proofView.select("#N" + x.data.source.id).on("click", (event, node) => {// } 
                if (node.data.source.id !== proof.rules.#lastPopoverTriggerID) {
                    proof.rules.openExplanation({ event }, [node]);
                    proof.rules.#lastPopoverTriggerID = node.data.source.id;
                } else {
                    proof.rules.destroyExplanation({ event, node });
                }
            });
        });
    }

    highlightNodes(nodes) {
        let premises = [];
        let iDsToHighlight = [];
        let data, conclusion, cnode = nodes[nodes.length - 1];
        data = cnode.data;
        
        nodes.forEach(node => {
            conclusion = proof.nodeVisuals.getLabel(node.parent.data.source);
            iDsToHighlight.push(node.parent.data.source.id, node.data.source.id); // axiom, rule
            
            if (node._children) { // _children queries the tree regardless of collapsing or expanding
                node._children.forEach(child => {
                    premises.push(proof.nodeVisuals.getLabel(child.data.source));
                    iDsToHighlight.push(child.data.source.id);
                });
            }
        });

        proof.nodeVisuals.changeOpacities(iDsToHighlight);

        return { data, premises, conclusion };
    }

    openExplanation(_params, nodes) {
        utils.setMeasure();

        if (!proof.showPopover) {
            return;
        }
        
        if (_params.event.ctrlKey && proof.compactInteraction) {
			nodes[0].children = nodes[0]._children; // expand rule
            nodes[0].children?.forEach(c => {
                c.children = null; // collapse children of rule
            });
            proof.update();
		}

        const { data, premises, conclusion } = this.highlightNodes(nodes);
        const ruleName = proof.nodeVisuals.getLabel(data.source);
        const subProof = proof.rules.#getSubProof(data);

        params = {
            event: _params.event,
            premises,
            conclusion,
            data: _params?.data ? _params.data : data,
            nodes: _params?.nodes ? _params.nodes : nodes,
            subProof,
            isSubProof: _params?.isSubProof || !proof.showSubProofs,
            large: _params?.large || false,
            ruleName // source of explanation trigger
        };

        this.#renderExplanation();
    }

    destroyExplanation({ event={ctrlKey:false}, node } = {}) {
        if (event.ctrlKey && proof.compactInteraction) {
			node.children = node._children; // expand rule
            node.children?.forEach(c => {
                c.children = c._children; // expand children of rule
            });
            proof.update();
		}

        if (popover) { popover.remove(); }

        proof.rules.#lastPopoverTriggerID = null;
        proof.nodeVisuals.setFullOpacityToAll();
        d3.selectAll("#H1 text").text("help_outline");
        
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