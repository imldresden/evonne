import { camelCaseShorteningFunctions } from "./camel.js";
import { BasicShorteningFunctions } from "./basic.js";

export class LabelsShorteningHelper {

    constructor() {
        this._cCSFs = new camelCaseShorteningFunctions();
        this._bSFs = new BasicShorteningFunctions();
    }

    chooseShortening(style) {
        if (style === "camel") {
            return this._cCSFs;
        } else if (style === "basic") {
            return this._bSFs;
        }
    }

    applyShortening(style) {
        const shortening = this.chooseShortening(style);
        shortening && shortening.shortenAllLabels();
    }

    shortenLabel(label, includeRuleNames, style) {
        const shortening = this.chooseShortening(style);
        return shortening ? shortening.shortenLabel(label, includeRuleNames) : label;
    }
}