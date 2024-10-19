
export class RuleNameMapHelper {

    constructor() {
        this._original2alternativeNamesMap = new Map();
        this._alternative2originalNamesMap = new Map();
    }

    setRuleNamesMaps(map) {
        Object.entries(map).forEach(e=>{
            this._original2alternativeNamesMap.set(e[0],e[1]);
            this._alternative2originalNamesMap.set(e[1],e[0]);
        });
    }

    getOriginalName(alternativeName){
        return this.getName(alternativeName, this._alternative2originalNamesMap)
    }

    getAlternativeName(originalName){
        return this.getName(originalName, this._original2alternativeNamesMap)
    }

    getName(key, map){
        return map.has(key) ? map.get(key) : key;
    }
}
