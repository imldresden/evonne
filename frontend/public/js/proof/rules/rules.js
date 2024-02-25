import { proof } from "../../proof/proof.js";
import { DLRules } from "./dl-rules.js";
import { CDRules } from "./cd-rules.js";

let tooltip, div, lastToolTipTriggerID;

const rule_sets = {
    dl: new DLRules(),
    cd: new CDRules(),
}

const utils = {
    addTitle: function(text) {
        let title = div.append("header").attr("id", "tooltip-handle-bar")
        title.append("i")
            .attr("class", "material-icons right modal-close")
            .html("close")
            .on("click", () => proof.rules.destroyExplanation())
    
        title.append("h2").attr("align", "center").text(text);
    }, 
    
    addSeparator: function () {
        div.append("br");
        div.append("br");
    },
    
    addMidRule: function (lengths) {
        div.append("hr").attr("class", "mid").attr("width", this.getRuleLength(lengths));
    },
    
    getRuleLength: function (lengths) {
        let length = 0;
        for (let i = 0; i < lengths.length; i++) {
            length += (lengths[i] * 10) + 40;
        }
    
        return length - 40;
    },
    
    isRule: function(type) {
        return type.includes("rule") || type.includes("Rule");
    }
}

class RulesHelper {

    addTooltipToNodes() {
        let proofView = proof.svg;
        //Reset
        d3.selectAll("body .tooltip-explanation").remove();

        proofView.selectAll(".rule").each(x => {
            proofView.select("#N" + x.data.source.id).on("click", (event, node) => {
                if (node.data.source.id !== lastToolTipTriggerID) {
                    this.destroyExplanation();

                    let conclusion = x.parent.data.source.element;
                    let premises = [];
                    let iDsToHighlight = [x.parent.data.source.id];
            
                    if (x.children) {
                        x.children.forEach(child => { 
                            premises.push(child.data.source.element);
                            iDsToHighlight.push(child.data.source.id);
                        });
                    }

                    iDsToHighlight.push(node.data.source.id);
                    lastToolTipTriggerID = node.data.source.id;
                    proof.nodeVisuals.changeOpacities(iDsToHighlight);
                    this.showExplanation(event, { premises, conclusion, data: node.data });
                } else {
                    this.destroyExplanation();
                }
            });
        });
    }

    showExplanation(event, { premises, conclusion, data }) {

        //create the tooltip
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip-explanation")
            .attr("id", "toolTipID");
        
        div = tooltip
            .append("div").attr("class", "tooltiptext")
            .attr("id", "explanationTextSpan");

        const ruleName = data.source.element;

        if (data.source.type === "rule" || data.source.type === "DLRule") {
            rule_sets.dl.draw({ ruleName, div, premises, conclusion });
        } else if (data.source.type === "CDRule") {
            rule_sets.cd.draw({ ruleName, tooltip, data: data.source.data });
        } else {
            console.error(`unknown rule type: "${data.source.type}"`);
        }

        if (proof.ruleExplanationPosition === "mousePosition") {
            this.setPositionRelativeToMouse(event)
        } else {
            tooltip.classed(this.getPositionClass(proof.ruleExplanationPosition), true);
        }

        this.makeDraggable(document.getElementById("toolTipID"), document.getElementById("tooltip-handle-bar"));
    }

    destroyExplanation() {
        if (tooltip) {
            tooltip.remove();    
        }

        lastToolTipTriggerID = null;
        proof.nodeVisuals.setFullOpacityToAll();
        d3.selectAll("#H1 text").text("\ue1b7");
    }

    getPositionClass(ruleExplanationPosition) {
        if (ruleExplanationPosition === "rightBottom") {
            return "positionRB";
        } else if (ruleExplanationPosition === "rightTop") {
            return "positionRT";
        } else if (ruleExplanationPosition === "leftTop") {
            return "positionLT";
        }

        return "positionLB";
    }

    setPositionRelativeToMouse(event) {
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

    // https://www.w3schools.com/howto/howto_js_draggable.asp
    makeDraggable(elmnt, handle) {
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
}

export { RulesHelper, utils };