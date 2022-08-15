import { SharedData } from "../shared-data.js";

export class BasicShorteningFunctions {
    constructor() {
    }

    shortenAllLabels() {
        SharedData.labels.selectAll(".node text").text(d => this.shortenLabel(d.data.source.element))
    }

    shortenLabel(text, includeRuleNames) {
        /* if (!includeRuleNames && !["⊑", "≡", "=", "disjoint"].some(x => text.includes(x)))
            return text;*/
        const maximumLength = document.getElementById("maximumLength").value;
        return text.length > maximumLength ? `${text.substring(0, maximumLength)}\u2026` : text;
    }
}