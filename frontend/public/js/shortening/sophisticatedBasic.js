import {fillMaps, ShorteningCommonData as data} from "./common.js";

export class BasicSophisticatedShorteningFunctions {
    _CCToFull;
    _FullToCC;
    _CCToCount;
    _maxLength;
    _placeHolderToOriginal;
    _placeHolderToShort;
    _placeHolderCounter;
    _placeHolderPrefix = "!";

    constructor() {
        this.resetAll();
    }

    shortenAllLabels(){
        this.resetIfNewMax();
    }

    resetIfNewMax() {
        const currentMaxLength = document.getElementById("maximumLength").value;
        if (currentMaxLength!==this._maxLength){
            this.resetAll();
            return true;
        }
        return false;
    }

    resetAll(){
        this._CCToFull = new Map();
        this._FullToCC = new Map();
        this._CCToCount = new Map();

        this._maxLength = document.getElementById("maximumLength").value;

        this.resetForNewText();
    }

    resetForNewText(){
        this._placeHolderToOriginal= new Map();
        this._placeHolderToShort = new Map();
        this._placeHolderCounter = 0;
    }

    shortenLabel(text, includeRuleNames) {
        if (!this.resetIfNewMax())
            this.resetForNewText();

        if (!text)
            return;
        if (text.includes(data.subsumes))
            return this.getFirstNChars(text.split(data.subsumes)[0].trim()) + data.subsumesDisplay +
                this.getFirstNChars(text.split(data.subsumes)[1].trim());

        else if (text.includes(data.equivalence))
            return this.getFirstNChars(text.split(data.equivalence)[0].trim()) + data.equivalenceDisplay +
                this.getFirstNChars(text.split(data.equivalence)[1].trim());

        else if (text.includes(data.disjoint))
            return text.replace(data.regInnerPar, this.getMultiFirstNChars(text.match(data.regInnerPar)))

        else if (text.includes(data.domain))
            return data.domain + this.getFirstNCharsForEquality(text.match(data.regEquals));

        else if (text.includes(data.range))
            return data.range + this.getFirstNCharsForEquality(text.match(data.regEquals));

        else if (includeRuleNames){
            let res = this.getShort(text);
            if (!res)
                return text;

            fillMaps(res, text, this);
            return this._FullToCC.get(text);
        }
        return text;
    }

    getMultiFirstNChars(match) {
        let result = [];
        match = match[0].replace(data.regPar, "");
        match = match.split(",");
        match.forEach(element => {
            result.push(this.getShort(element.trim()))
        });
        return `(${result.join(",")})`;
    }

    getFirstNCharsForEquality(text) {
        let result = [];
        text = text[0].replace(data.regPar, "").split("=")
        text.forEach(element => {
            result.push(this.getShort(element.trim()))
        });

        return `(${result[0]}) = ${result[1]}`
    }

    getFirstNChars(text) {
        let res = this.createTextWithPlaceHolders(text);

        while([...this._placeHolderToOriginal.keys()].some(key=>res.includes(key))){
            for (const [key] of this._placeHolderToOriginal.entries()) {
                res = res.replace (key, this._placeHolderToShort.get(key));
            }
        }

        return res;
    }

    createTextWithPlaceHolders(text) {
        let tmp = text.match(data.regInnerPar);
        if(!tmp){
            if (text.split(data.sepReg).length>2)
                tmp = text.split(data.sepReg);
            else
                return this.getShort(text);
        }

        let placeHolder,shortString;
        tmp.forEach(inner=>{
            placeHolder = this._placeHolderPrefix + ++this._placeHolderCounter;
            shortString = this.getShort(inner.substring(1,inner.length-1))
            this.mapPlaceHolders(placeHolder,inner,"("+shortString+")")
            text = text.replace(inner, placeHolder);
        });
        return this.createTextWithPlaceHolders(text);
    }

    mapPlaceHolders(placeHolder, originalString, shortString) {
        if (!this._placeHolderToOriginal.has(placeHolder)) {
            this._placeHolderToOriginal.set(placeHolder, originalString);
            this._placeHolderToShort.set(placeHolder, shortString);
        }
    }

    getShort(text) {
        let original = (" " + text).slice(1);
        let concepts = text.split(data.sepReg);
        let current = undefined;
        concepts.forEach(concept => {
            concept = concept.trim();
            current = concept.length > this._maxLength ? `${concept.substring(0, this._maxLength)}` : concept;
            fillMaps(current,concept,this);
            current = this._FullToCC.get(concept) !== concept ? this._FullToCC.get(concept) + "\u2026":
                this._FullToCC.get(concept);
            original = original.replace(concept,current);
        });
        return original;
    }
}