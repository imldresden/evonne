import {AxiomClass, Domain, Range, Set, SetCollection} from "./dataStructure.js";
import {drawEulerDiagram} from "./draw.js";

/**
 * Index of the current arrow
 * Two sets will have the same arrowId if a arrow should be drawn from one to the other
 * To specify the direction there is the {@link Set#from} attribute. If it is true the arrow will start at this set
 * The two sets must have different {@link Set#from} value.
 * @type {number}
 */
let currentArrowId = 0;

/**
 * Size attributes for some sets
 * @type {number}
 */
const SIZE_SINGLE_CLASS_OF_INTERSECTION = 2;
const SIZE_OF_INTERSECTION = 1;
const SIZE_OF_UNION = 4;
const SIZE_SINGLE_CLASS_OF_UNION = 1;
const SIZE_SUB_SUM_MAIN = 20;
const SIZE_SUB_SUM_CHILD = 10;

/**
 * index of current euler diagram from euler.js (is updated via {@link updateCurrentDiagramId}
 * @type {number}
 */
let currentDivId = undefined;

/**
 * Add a new set to the intersection
 * @param {AxiomClass}axiom axiom which should be added
 * @param {SetCollection}collection collection which should be appended
 * @returns the same collection with the axiom
 */
function addNewSetToIntersection(axiom, collection) {
    for (let set of collection.sets) {
        // We only look for the "main sets"
        if (set.sets.length === 1) {
            //if we find one we get the label of this set
            let setOfList = set.sets[0];
            // and add a intersection set to the SetCollection so vennjs knows there is a intersection between them
            collection.add(new Set([axiom.getLabel(), setOfList], SIZE_OF_INTERSECTION).setIntersection());
        }
    }

    // in the end add the axiom on its own to the collection
    collection.add(new Set([axiom.getLabel()], SIZE_SINGLE_CLASS_OF_INTERSECTION).setIntersectionParent());
    return collection;
}

/**
 * Add a parent class which includes all sets from the collection
 * @param {AxiomClass}axiom parent axiom
 * @param {SetCollection}collection child collection
 * @param {number}main_size size of the parent set
 * @param {number}child_size size of the child set
 * @returns collection with axiom;
 */
function addSubsumeMainClass(axiom, collection, main_size = SIZE_SUB_SUM_MAIN, child_size = SIZE_SUB_SUM_CHILD) {
    for (let set of collection.sets) {
        if (set.sets.length === 1) {
            collection.add(new Set([axiom.getLabel(), set.sets[0]], child_size));
        }
    }
    collection.add(new Set([axiom.getLabel()], main_size));
    return collection;
}

/**
 * Generate a arrow from a axiom to a collection
 * @param {AxiomClass}axiom
 * @param {SetCollection}collection with only one set
 * @returns {SetCollection}
 */
function generateArrowClasses(axiom, collection) {
    if (collection.sets.length > 1) throw "Unsupported for NOW";
    let collectionWithArrow = new SetCollection();

    /**
     * see {@link Set#setArrow}
     */
    collectionWithArrow.add(new Set([collection.sets[0].sets[0]], 1)
        .setArrow(currentArrowId, true, undefined, axiom.isExistence()));
    collectionWithArrow.add(new Set([axiom.getLabel(true)], 1)
        .setArrow(currentArrowId, false, axiom.getRelationLabel(), axiom.isExistence()));

    currentArrowId++;
    return collectionWithArrow;
}

/**
 * Generate a subsume of two operands
 * @param {SetCollection|AxiomClass}operand1
 * @param {SetCollection|AxiomClass}operand2
 * @returns {SetCollection}
 */
function generateSubsume(operand1, operand2) {
    let collection = new SetCollection();

    // for now the main set cant be a collection of sets, because we dont know how to visualize that properly
    if (operand1 instanceof SetCollection && operand2 instanceof AxiomClass) {
        throw "Unsupported statement";
    }
    // if the child is a collection
    else if (operand2 instanceof SetCollection && operand1 instanceof AxiomClass) {
        collection = operand1.isRelation()
            //generate arrow class if it is a relation
            ? generateArrowClasses(operand1, operand2)
            // otherwise add a parent set to the existing operands
            : addSubsumeMainClass(operand1, operand2);
    }
    //if both are AxiomClasses
    else {

        // add the second operand as child
        collection.add(new Set([operand2.getLabel()], SIZE_SUB_SUM_CHILD));

        // If this is a relation, we have to add a arrow
        // operand 2 will always be just a axiom class
        // so we can add it already before this check
        // and if operand1 is a relation we need already a collection
        if (operand1.isRelation()) {
            collection = generateArrowClasses(operand1, collection);
        } else {
            collection.add(new Set([operand1.getLabel()], SIZE_SUB_SUM_MAIN));
            collection.add(new Set([operand1.getLabel(), operand2.getLabel()], SIZE_SUB_SUM_CHILD));
        }

    }
    return collection;
}

/**
 * Add a set to a union
 * @param {AxiomClass}axiom
 * @param {SetCollection}collection
 * @returns {SetCollection}
 */
function addNewSetToUnion(axiom, collection) {
    // add the axiom as set to the collection
    collection.add(new Set([axiom.getLabel()], SIZE_SINGLE_CLASS_OF_UNION));
    for (let set of collection.sets) {
        // check for all sets if they are considered to be a main class
        if (set.isMainClass) {

            // if so add a new set the collection containing axiom and the this set (this is venn.js thing don't ask)
            collection.add(new Set([axiom.getLabel(), set.sets[0]], SIZE_SINGLE_CLASS_OF_UNION));
            set.size++;
        }
    }
    return collection;
}

/**
 * Check if a operand is already a {@link SetCollection} if so this method will just return the operand again. Otherwise
 * the axiom will be translated into a {@link SetCollection} and returned
 * @param {SetCollection|AxiomClass}operand
 * @returns {SetCollection}
 */
function translateAxiomClassOrCollection(operand) {
    if (operand instanceof AxiomClass) {
        let collection = new SetCollection();
        collection.add(new Set([operand.getLabel()], 1))
        return collection;
    }
    return operand;
}

/**
 * Add the range object to the collection
 * @param {SetCollection}collection
 * @param {Range}range
 */
function addRange(collection, range) {
    let set = new Set(["Range: " + range.label], 1).setArrow(currentArrowId, false, range.functionName, false);
    let axiom = new AxiomClass(" ");

    set.setRange();
    collection.add(set);

    // add a parent set to the range so it does look like there is something around it
    addSubsumeMainClass(axiom, collection, 2, 1);
}

/**
 * Add the domain object to the collection
 * @param {SetCollection}collection
 * @param {Domain}domain
 */
function addDomain(collection, domain) {
    let set = new Set(["Domain: " + domain.label], 2).setArrow(currentArrowId, true, domain.functionName, false);
    set.setDomain();
    collection.sets.splice(0, 0, set);
}


/**
 * Evaluation functions for the operators. Linked via the FunctionIdentifier of configuration.json
 */
const evaluations = {
    "evaluateSubSums": function (operand1, operand2) {
        // evaluate the subsume operator with the generateSubsume function
        let collection = generateSubsume(operand1, operand2);

        // draw the result
        drawEulerDiagram(collection, getCurrentIdWithoutTag());
    },
    "evaluateDisjoint": function (params) {
        // this is a special operator
        // get the parts of the disjoint by first removing disjoint( ... )
        // e.g. disjoint(A,B,C,D) -> parts = A,B,C,D
        let parts = params.substring(9, params.length - 1);
        let collection = new SetCollection();
        // split the parts at ","
        // -> ["A","B","C","D"]
        for (let type of parts.split(",")) {
            // add a new set for every argument
            // we dont have to do something else because they should be disjoint
            collection.add(new Set([type], 1))
        }

        // draw the result
        drawEulerDiagram(collection, getCurrentIdWithoutTag())
    },
    "evaluateSpecialOperator": function (params) {

        // handle domain and range

        let collection = new SetCollection();

        // if the domain or the range wasn't set (sometimes a domain appears without a range and also to other way around)
        // we initialize them with a "empty" set, a set without a label
        if (params.rangeObject === undefined) {
            params.rangeObject = new Range("range("+ params.domainObject.functionName+")= range");
            params.rangeObject.label = " ";
        }
        if (params.domainObject === undefined) {
            params.domainObject = new Domain("domain("+ params.rangeObject.functionName+")= domain");
            params.domainObject.label = " ";
        }

        // the order is important. First add the range THEN the domain
        addRange(collection, params.rangeObject);
        addDomain(collection, params.domainObject);

        // increment the arrow id because domain and range have an arrow between them
        currentArrowId++;

        // draw the result
        drawEulerDiagram(collection, getCurrentIdWithoutTag());
    },
    "evaluateEquivalence": function (operand1, operand2) {

        // for equivalence we draw to different diagrams (both operands on their own)
        // for that we first create a new div for both operands
        d3.select(getCurrentId()).append("div").attr("id", getCurrentIdWithoutTag() + "_1");

        // ... and add the equivalence symbol between them
        d3.select(getCurrentId()).append("span").text("≡").attr("class", "textEquivalence");
        d3.select(getCurrentId()).append("div").attr("id", getCurrentIdWithoutTag() + "_2");

        // check if they are still a axiom class. If so transform them into a collection
        let collection1 = translateAxiomClassOrCollection(operand1);
        let collection2 = translateAxiomClassOrCollection(operand2);

        // draw both diagrams
        drawEulerDiagram(collection1, getCurrentIdWithoutTag() + "_1");
        drawEulerDiagram(collection2, getCurrentIdWithoutTag() + "_2");
    },
    "evaluateUnion": function (operand1, operand2) {
        // add a new set to a existing collection with the operator union
        let collection = new SetCollection();

        // Check if there is already a set collection and which of them is a set collection
        // currently we dont support both operands being a set collection
        if (operand1 instanceof SetCollection && operand2 instanceof AxiomClass) {
            collection = addNewSetToUnion(operand2, operand1);
        } else if (operand2 instanceof SetCollection && operand1 instanceof AxiomClass) {
            collection = addNewSetToUnion(operand1, operand2);
        } else {
            // if no collection exists create a new one
            collection.add(new Set(["UNION"], SIZE_OF_UNION).setMainClass().setLabel(" "));
            collection.add(new Set(["UNION", operand1.getLabel()], SIZE_SINGLE_CLASS_OF_UNION));
            collection.add(new Set(["UNION", operand2.getLabel()], SIZE_SINGLE_CLASS_OF_UNION));
            collection.add(new Set([operand1.getLabel()], SIZE_SINGLE_CLASS_OF_UNION));
            collection.add(new Set([operand2.getLabel()], SIZE_SINGLE_CLASS_OF_UNION));
        }
        return collection;
    },
    "evaluateIntersection": function (operand1, operand2) {
        // merge both operands with the intersection operator
        let collection = new SetCollection();


        // Check if there is already a set collection and which of them is a set collection
        if (operand1 instanceof SetCollection && operand2 instanceof AxiomClass) {
            collection = addNewSetToIntersection(operand2, operand1);
        } else if (operand2 instanceof SetCollection && operand1 instanceof AxiomClass) {
            collection = addNewSetToIntersection(operand1, operand2);
        } else {

            //if not create a new intersection
            collection.add(new Set([operand2.getLabel()], SIZE_SINGLE_CLASS_OF_INTERSECTION).setIntersectionParent());
            // check if the intersection might be a relation!
            if (operand1 instanceof AxiomClass && operand1.isRelation()) {
                collection = generateArrowClasses(operand1, collection);
            } else {
                collection.add(new Set([operand1.getLabel()], SIZE_SINGLE_CLASS_OF_INTERSECTION).setIntersectionParent());
                collection.add(new Set([operand1.getLabel(), operand2.getLabel()], SIZE_OF_INTERSECTION).setIntersection());
            }
        }
        return collection;
    }
}

/**
 * Is called from euler.js whenever the index of the current euler diagram is increased
 * @param newDivId
 */
function updateCurrentDiagramId(newDivId) {
    currentDivId = newDivId;
}

/**
 * This function will look for a function with the key functionName inside the {@link evaluations} and then will call this function with the given args
 * @param {string}functionName given function name from configuration.js
 * @param args arguments to call the function with
 * @returns {*} the result of the function which was executed
 */
function runFunction(functionName, args) {
    return evaluations[functionName](...args);
}

/**
 * Generate a id with "#" infront for d3.
 * @returns {string}
 */
function getCurrentId() {
    return "#" + getCurrentIdWithoutTag();
}

/**
 * Generate a id with the current index
 * @returns {string}
 */
function getCurrentIdWithoutTag() {
    return "id" + currentDivId + "_container"
}

export {runFunction, updateCurrentDiagramId, getCurrentIdWithoutTag}
