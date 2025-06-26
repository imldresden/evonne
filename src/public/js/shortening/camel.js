import { ShorteningCommonData as data, fillMaps} from "./common.js";

function getQuantifier(text) {
    if (text.includes(data.exists)) {
        return data.exists;
    } else if (text.includes(data.forall)) {
        return data.forall;
    }
    return undefined;
}

export class camelCaseShorteningFunctions {

    constructor() {
        this._CCToFull = new Map();
        this._FullToCC = new Map();
        this._CCToCount = new Map();
    }

    shortenLabel(text, includeRuleNames) {
        if (!text) {
            return;
        }
            
        if (text.includes(data.subsumes)) {
            return this.cCConcept(text.split(data.subsumes)[0]) + data.subsumes +
                this.cCConcept(text.split(data.subsumes)[1]);
        } else if (text.includes(data.equivalence)) {
            return this.cCConcept(text.split(data.equivalence)[0]) + data.equivalence +
                this.cCConcept(text.split(data.equivalence)[1]);
        } else if (text.includes(data.disjoint)) {
            return text.replace(data.regInnerPar, this.cCConcepts(text.match(data.regInnerPar)))
        } else if (text.includes(data.domain)) {
            return data.domain + this.cCPair(text.match(data.regEquals));
        } else if (text.includes(data.range)) {
            return data.range + this.cCPair(text.match(data.regEquals));
        } else if (includeRuleNames) {
            let res = text.match(data.regCap);
            if (!res) {
                return text; 
            }

            res = res.join("");
            fillMaps(res, text, this);
            return this._FullToCC.get(text);
        }

        return text;
    }

    cCConcept(text) {

        let original = (" " + text).slice(1);
        let concepts = text.split(data.sepReg);
        let current = undefined;
        concepts.forEach(concept => {
            current = this.camelCaseChain(concept.trim().replace(data.regPar, ""));

            if (concept.match(data.regOpenParConExp)===null) {
                current = concept.replace(concept.trim().replace(data.regPar, ""), current);
            } else {
                let tmpConcepts = concept.split(concept.match(data.regOpenParConExp));
                current = concept;
                tmpConcepts.forEach(x=>{
                    current = current.replace(x.replace(data.exists,"").trim(),
                        this._FullToCC.get(x.replace(data.exists,"").trim()));
                });

            }
            original = original.replace(concept,current);
        });
        return original;
    }

    camelCaseChain(text) {
        let elements = text.split(data.dot);
        let result = []
        elements.forEach(element => {
            result.push(this.camelCase(element))
        })
        return result.join("")
    }

    camelCase(text) {
        let quantifyRole = undefined;
        let roleName = undefined;
        let conceptName = undefined;
        let ccForm;

        let quantifier = getQuantifier(text);

        //Camel Case of qualified expression
        if(quantifier){
            quantifyRole = text.substring(text.indexOf(quantifier), text.length);
            roleName = quantifyRole.substring(1, quantifyRole.length);

            let restRoleName = roleName.match(data.regCap);
            ccForm = roleName[0];
            if (restRoleName) {
                ccForm = ccForm + restRoleName.join("");
            }   
            if (roleName) {
                fillMaps(ccForm, roleName, this);
            }
            return quantifier + this._FullToCC.get(roleName) + data.dot;
        } else {
            conceptName = text
            ccForm = text;
            if (ccForm.match(data.regCap)) {
                ccForm = ccForm.match(data.regCap).join("");
            }
            if (ccForm[0] !== text[0]) {
                ccForm = text[0] + ccForm;
            }
            if (conceptName.includes(data.not)) {
                ccForm = data.not + ccForm;
            }
            fillMaps(ccForm, conceptName, this);
            return this._FullToCC.get(conceptName);
        }
    }

    cCConcepts(match) {
        let result = [];
        match = match[0].replace(data.regPar, "");
        match = match.split(",");
        match.forEach(element => {
            result.push(this.camelCase(element.trim()))
        });
        return `(${result.join(",")})`;
    }

    cCPair(match) {
        let result = [];

        match = match[0].replace(data.regPar, "").split("=")
        match.forEach(element => {
            result.push(this.camelCase(element.trim()))
        });

        return `(${result[0]}) = ${result[1]}`
    }
}