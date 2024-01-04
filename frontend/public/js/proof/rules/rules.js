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
        let title = div.append("header")
        
        title.append("i")
            .attr("class", "material-icons right modal-close")
            .html("close")
            .on("click", () => {
                tooltip.selectAll("*").remove();
                lastToolTipTriggerID = null;
            })
    
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

class InferenceRulesHelper {

    addTooltipToNodes() {
        let proofView = d3.select("#proof-view");
        //Reset
        d3.selectAll("body .tooltip-explanation").remove();

        proofView.selectAll(".rule").each(x => {

            let conclusion = x.parent.data.source.element;
            let premises = [];
    
            if (x.children) {
                x.children.forEach(child => premises.push(child.data.source.element));
            }

            proofView.select("#N" + x.data.source.id).on("click", (event, node) => {
                this.showExplanation(event, { premises, conclusion, data: node.data });
            });
        });
    }

    showExplanation(event, { premises, conclusion, data }) {

        if (tooltip) {
            tooltip.selectAll("*").remove();
        }

        if (data.source.id !== lastToolTipTriggerID) {
            //create the tooltip
            tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip-explanation")
                .attr("id", "toolTipID");
            
            lastToolTipTriggerID = data.source.id;
            this.makeDraggable(document.getElementById("toolTipID"));

        } else {
            lastToolTipTriggerID = null;
            return;
        }

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

            let x = event.clientX + width > proof.proofWidth
                ? proof.proofWidth - width
                : event.pageX;
            let y = event.clientY + height > proof.proofHeight
                ? proof.proofHeight - height
                : event.pageY;

            tooltip.style("left", x + "px").style("top", y + "px");
        }
    }

    // https://www.w3schools.com/howto/howto_js_draggable.asp
    makeDraggable(elmnt) {
        let x = 0, y = 0, clientX = 0, clientY = 0;
        elmnt.onmousedown = dragMouseDown;
        
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

export { InferenceRulesHelper, utils };