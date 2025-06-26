/**
 * The domain and range rule belong together. So if they are found next to each other they have to be merged to one axiom.
 * But sometimes they appear on their own (there is a domain but no range and also the other way around)
 * To better handle those cases we created this class.
 * If one does not exist its initialized with undefined.
 */
class FunctionDomainRange {

    /**
     * @param {Domain}domain domain of the axiom function
     * @param {Range}range range of the axiom function
     */
    constructor(domain, range) {
        this.domainObject = domain;
        this.rangeObject = range;
    }

    /**
     * because this axiom contains two axioms we need a "new" title for the draw function
     * @returns {string|*} combined string of both axioms (if present)
     */
    getText() {
        const textDomain = this.domainObject ? this.domainObject.text : "";
        const textRange = this.rangeObject ? this.rangeObject.text : "";
        return this.domainObject && this.rangeObject ? textDomain + ", " + textRange : textDomain + textRange;
    }

}

/**
 * Abstract class. Parent class of {@link Domain} and {@link Range}
 */
class FunctionPart {

    /**
     * The domain and the range have the same syntax:
     * range/domain (functionName) = label
     * @param {string}functionName
     * @param {string}label
     */
    constructor(functionName, label) {
        this.functionName = functionName;
        this.label = label;
    }

}

/**
 * Handle the Domain part of {@link FunctionDomainRange}
 */
class Domain extends FunctionPart {

    /**
     * @param {string} expression
     */
    constructor(expression) {
        super();
        this.text = expression;
        expression = expression.replace("domain(", "");
        expression = expression.replace(")", "");
        let expressionParts = expression.split("=")
        this.functionName = expressionParts[0].trim();
        this.label = expressionParts[1].trim();
    }

}

/**
 * Handle the Range part of {@link FunctionDomainRange}
 */
class Range extends FunctionPart {

    /**
     * @param {string} expression
     */
    constructor(expression) {
        super();
        this.text = expression;
        expression = expression.replace("range(", "");
        expression = expression.replace(")", "");
        let expressionParts = expression.split("=")
        this.functionName = expressionParts[0].trim();
        this.label = expressionParts[1].trim();
    }

}


const exists = "∃";
const all = "∀";

/**
 * Class to parse an axiom
 * You can check if this axiom is a relation with {@link AxiomClass#isRelation}
 * If so you can get the label a "special" label with {@link AxiomClass#getLabel}
 */
class AxiomClass {

    /**
     *
     * @param {string} axiom
     */
    constructor(axiom) {
        this.axiom = axiom.trim();
    }

    /**
     * @returns {boolean} axiom is a relation
     */
    isRelation() {
        return this.isExistence()|| this.isAll();
    }

    /**
     * check if existence quantifier
     * @returns {boolean} {@link AxiomClass#axiom} includes {@link exists}
     */
    isExistence() {
        return this.axiom.includes(exists);
    }

    /**
     * check if all quantifier
     * @returns {boolean} {@link AxiomClass#axiom} includes {@link all}
     */
    isAll() {
        return this.axiom.includes(all);
    }

    /**
     * Returns the label which will be shown in the euler diagram. In case its a Relation the label would look something like:
     * part1.part2
     * @param {boolean}getRelationTag handle it as relation label or not
     * @returns {string} label of the axiom
     */
    getLabel(getRelationTag = false) {
        if (this.isRelation() && getRelationTag) {
            return this.axiom.split(".")[1];
        }
        return this.axiom;
    }

    /**
     * As mentioned in {@link AxiomClass#getLabel} a relation axiom looks something like:
     * part1.part2
     * This method returns the value which will be shown at the arrow.
     * @returns {string} label for the arrow (equivalent to part1)
     */
    getRelationLabel() {
        return this.axiom.split(".")[0].replaceAll(exists, "").replaceAll(all, "");
    }
}

/**
 * Basically a list of {@link Set}'s
 */
class SetCollection {

    constructor() {
        this.sets = []
    }

    /**
     * add a new set to the collection
     * @param {Set} set
     */
    add(set) {
        this.sets.push(set);
    }

}

/**
 * Class to handle the venn.js data structure
 */
class Set {

    /**
     * @param {Array<String>}label label of the euler diagram
     * @param {number}size size of the euler diagram
     */
    constructor(label, size) {
        this.sets = label;
        this.size = size;
        this.isMainClass = false;
        this.arrowId = undefined;
        this.from = false;
        this.text = undefined;
        this.dotted = false;
        this.intersection = false;
        this.intersectionParent = false;
        this.isRange = false;
        this.isDomain = false;
        this.label = undefined;
    }

    setMainClass(){
        this.isMainClass = true;
        return this;
    }

    /**
     * Configure arrow of this set
     * @param {number} arrowId current arrow id (always two sets with the same arrow id)
     * @param {boolean} from is this set the origin of the arrow (true = origin, false = destination)
     * @param {string} text label of the arrow
     * @param {boolean} dotted should the arrow be dotted
     * @returns {Set}
     */
    setArrow(arrowId, from, text, dotted){
        this.arrowId = arrowId;
        this.from = from;
        this.dotted = dotted;
        this.text = text;
        return this;
    }

    /**
     * Used for adding a new set to a intersection. This set is the intersection of the new set and a existing one
     * @returns {Set}
     */

    setIntersection() {
        this.intersection = true;
        return this;
    }

    /**
     * Used for adding a new set to a intersection. Tell the view that this is a parent (the class on its own)
     * @returns {Set}
     */
    setIntersectionParent() {
        this.intersectionParent = true;
        return this;
    }

    /**
     * Set is a Range
     * @returns {Set}
     */
    setRange() {
        this.isRange = true;
        return this;
    }

    /**
     * Set is a domain
     * @returns {Set}
     */
    setDomain() {
        this.isDomain = true;
        return this;
    }

    /**
     * set the label of this Set
     * @param label
     * @returns {Set}
     */
    setLabel(label) {
        this.label = label;
        return this;
    }

}

export{Range, Domain, FunctionDomainRange, Set, SetCollection, AxiomClass}