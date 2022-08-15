//import { LengthBasedShorteningFunctions } from "./length.js"
import { BasicShorteningFunctions } from "./basic.js"
import { camelCaseShorteningFunctions } from "./camel.js";
import {BasicSophisticatedShorteningFunctions} from "./sophisticatedBasic.js";

export class LabelsShorteningHelper {

    constructor() {
        this._cCSFs = new camelCaseShorteningFunctions();
        this._bSFs = new BasicSophisticatedShorteningFunctions();
    }

    chooseShortening(style) {
        if (style === "camel") {
            return this._cCSFs;
        }
        // else if (this._shorteningStyle === "lengthBased"){
        //     return new LengthBasedShorteningFunctions();
        // }
        // else if (style === "basic") {
        //     return new BasicShorteningFunctions();
        // }
        else if (style === "basic") {
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