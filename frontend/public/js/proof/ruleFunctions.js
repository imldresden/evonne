//The following works under the following assumption:
//				- Rule name nodes exist, and are of class "node rule"
//
//Call "addTooltipToNodes()" to add an explanation to every rule name node in the proof
//=====================================================================================

//TODO implement an option to choose between DL or OWL syntax

import { parallelCoords } from "../parallel-coords/parallel-coords.js";
import { APP_GLOBALS as app } from "../shared-data.js";

const subsumes = "⊑", subsumesDisplay = " ⊑ ", exists = "∃", top = "⊤", bot = "⊥",
    dotTop = ".⊤", and = "⊓", andDisplay = " ⊓ ", dot = ".",
    equivalence = "≡", equivalenceDisplay = " ≡ ", disjoint = "disjoint",
    c1 = "Φ", c2 = "Ψ", c3 = "Ω", r1 = "ρ", r2 = "σ", r3 = "λ", r4 = "μ";

const ASSERTED_CONCLUSION = "Asserted Conclusion",
    CLASS_HIERARCHY = "Class Hierarchy",
    EXISTENTIAL_PROPERTY_EXPANSION = "Existential Property Expansion",
    INTERSECTION_COMPOSITION = "Intersection Composition",
    EXISTENTIAL_FILLER_EXPANSION = "Existential Filler Expansion",
    PROPERTY_DOMAIN_TRANSLATION = "Property Domain Translation",
    INTERSECTION_DECOMPOSITION = "Intersection Decomposition",
    EQUIVALENT_CLASSES_DECOMPOSITION = "Equivalent Classes Decomposition",
    DISJOINT_CLASSES_TRANSLATION = "Disjoint Classes Translation",
    Top_Super_Class = "Top Superclass";

const regBetweenPar = /\([^)]+\)/g, regPar = /[()]/g;

let displayObject, lastToolTipTriggerID;

export class InferenceRulesHelper {

    addTooltipToNodes() {
        let proofView = d3.select("#proof-view");
        //Reset
        d3.selectAll("body .tooltip-explanation").remove();

        //create the tooltip
        let tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip-explanation")
            .attr("id", "toolTipID");

        proofView.selectAll(".rule").each(x => {

            let ruleName = x.data.source.element;
            let conclusion = x.parent.data.source.element;
            let premise = [];
    
            if (x.children) {
                x.children.forEach(child => premise.push(child.data.source.element));
            }

            proofView.select("#N" + x.data.source.id).on("click", (event, node) => {
                this.showExplanation(event, tooltip, { premise, conclusion, ruleName, data: node });
            });
        });
    }

    showExplanation(event, tooltip, { premise, conclusion, ruleName, data }) {
        tooltip.selectAll("*").remove();
        
        if (data.data.source.id !== lastToolTipTriggerID) {
            lastToolTipTriggerID = data.data.source.id;
            this.makeDraggable(document.getElementById("toolTipID"));
        } else {
            lastToolTipTriggerID = null;
            return;
        }

        if (data.data.source.data) {
            this.concreteDomain(data.data.source.data, tooltip);
        }

        switch (ruleName) {
            case CLASS_HIERARCHY:
                this.classHierarchy(premise, tooltip);
                break;

            case ASSERTED_CONCLUSION:
                this.assertedConclusion(conclusion, tooltip);
                break;

            case PROPERTY_DOMAIN_TRANSLATION:
                this.propertyDomainTranslation(premise, tooltip);
                break;

            case INTERSECTION_DECOMPOSITION:
                this.intersectionDecomposition(conclusion, tooltip);
                break;

            case EQUIVALENT_CLASSES_DECOMPOSITION:
                this.equivalentClassesDecomposition(premise, conclusion, tooltip);
                break;

            case EXISTENTIAL_PROPERTY_EXPANSION:
                this.existentialPropertyExpansion(premise, conclusion, tooltip);
                break;

            case INTERSECTION_COMPOSITION:
                this.intersectionComposition(premise, tooltip);
                break;

            case EXISTENTIAL_FILLER_EXPANSION:
                this.existentialFillerExpansion(premise, conclusion, tooltip);
                break;

            case DISJOINT_CLASSES_TRANSLATION:
                this.disjointClassesTranslation(premise, conclusion, tooltip);
                break;

            case Top_Super_Class:
                this.topSuperClass(conclusion, tooltip);
                break;
            default:
                break;
        }
        
        app.ruleExplanationPosition === "mousePosition"
            ? this.setPositionRelativeToMouse(event, tooltip)
            : tooltip.classed(this.getPositionClass(app.ruleExplanationPosition), true);
    }

    concreteDomain(data, tooltip) {
        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle("Numerical Logic", displayObject);

        //Add visualization
        tooltip.append("div")
            .style("width", "700px")
            .style("height", "300px")
            .append("div")
            .attr("class", "pcp-container")
            .attr("id", "pcp-container")
        
        const header = [...data.variables, "rhs"]; 
        const pcp_data = {};

        function getPolyline(data, id, color) {
            const augmentedEq = data.eqs[id];
            [...data.variables].forEach(v => {
                if (!augmentedEq[v]) {
                    augmentedEq[v] = "0"; 
                }
            });

            const polyline = { id, color };
            Object.keys(augmentedEq).forEach(k => {
                polyline[k] = { value: eval(augmentedEq[k]), type: 'numbers' }
            });
            
            return polyline;
        }

        Object.values(data.ops).forEach( (op, i) => {
            pcp_data[i] = [];

            op.premises.forEach(premise => {
                pcp_data[i].push(getPolyline(data, premise.eq, '--pcp-primary'));
            });
            pcp_data[i].push(getPolyline(data, op.conclusion, '--pcp-secondary'));
        });
        
        function makePCP(header, pcp_data) {
            parallelCoords(
                { id: "pcp", details: "pcp-container", width: 700, height: 300 }, 
                pcp_data,
                {
                    data_id: 'id',
                    nominals: [],
                    booleans: [],
                    numbers: header,
                    cols: header
                }
            );
        }

        let current = 0;
        tooltip.append("br");

        const prev = tooltip.append("button");
        prev.on("click", (e, d) => {
            current = Math.max(0, current -1);
            makePCP(header, pcp_data[current]);
        })
        prev.text("prev");

        const next = tooltip.append("button");
        next.on("click", (e, d) => {
            current = Math.min(current + 1, Object.keys(pcp_data).length-1);
            makePCP(header, pcp_data[current]);
        })
        next.text("next");
        makePCP(header, pcp_data[current]);
    }

    classHierarchy(premise, tooltip) {
        let leftAxiomLHS, commonPart, rightAxiomRHS;

        if (premise[0].split(subsumes)[1].trim() === premise[1].split(subsumes)[0].trim()) {
            leftAxiomLHS = premise[0].split(subsumes)[0];
            commonPart = premise[0].split(subsumes)[1];
            rightAxiomRHS = premise[1].split(subsumes)[1];
        } else {
            leftAxiomLHS = premise[1].split(subsumes)[0];
            commonPart = premise[0].split(subsumes)[0];
            rightAxiomRHS = premise[0].split(subsumes)[1];
        }

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(CLASS_HIERARCHY, displayObject);

        //Add rule definition
        this.addClassHierarchyAbstract(displayObject);

        let premiseLengths = [premise[0].length, premise[1].length];
        this.addSeparator(displayObject, this.getLarger(premiseLengths, CLASS_HIERARCHY.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("span").attr("class", "tab")
            .append("span").attr("class", "text-black").text(leftAxiomLHS + subsumesDisplay)
            .append("span").attr("class", "text-green").text(commonPart);

        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(commonPart)
            .append("span").attr("class", "text-black").text(subsumesDisplay + rightAxiomRHS);

        //Add the line
        this.addMidRule(displayObject, premiseLengths);

        //Add the conclusion
        displayObject
            .append("span").attr("class", "text-black").text(leftAxiomLHS + subsumesDisplay + rightAxiomRHS);
    }

    addClassHierarchyAbstract(displayObject) {
        displayObject
            .append("span").attr("class", "tab")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(c2);

        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(c2)
            .append("span").attr("class", "text-black").text(subsumesDisplay + c3);

        this.addMidRule(displayObject, [5, 5]);

        displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c3);
    }

    assertedConclusion(conclusion, tooltip) {
        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(ASSERTED_CONCLUSION, displayObject);

        //Add rule definition
        this.addAssertedConclusionAbstract(displayObject);

        let conclusionLength = [conclusion.length];
        this.addSeparator(displayObject, this.getLarger(conclusionLength, ASSERTED_CONCLUSION.length));

        //Add the current instantiation of the rule
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, conclusionLength);

        //Add the conclusion
        displayObject
            .append("span").attr("class", "text-black").text(conclusion);
    }

    addAssertedConclusionAbstract(displayObject) {
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, [6]);

        //Add the conclusion
        displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c2);
    }

    propertyDomainTranslation(premise, tooltip) {
        let roleName, concept;

        roleName = premise[0].substring(premise[0].indexOf("(") + 1, premise[0].indexOf(")")).trim();
        concept = premise[0].substring(premise[0].indexOf("=") + 1).trim();

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(PROPERTY_DOMAIN_TRANSLATION, displayObject)

        //Add rule definition
        this.addPropertyDomainTranslationAbstract(displayObject);

        let premiseLength = [premise[0].length];
        this.addSeparator(displayObject, this.getLarger(premiseLength, PROPERTY_DOMAIN_TRANSLATION.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text("domain(")
            .append("span").attr("class", "text-black").text(roleName)
            .append("span").attr("class", "text-green").text(")")
            .append("span").attr("class", "text-black").text(" = " + concept);

        //Add the line
        this.addMidRule(displayObject, premiseLength);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(roleName)
            .append("span").attr("class", "text-green").text(dotTop)
            .append("span").attr("class", "text-black").text(subsumesDisplay + concept);
    }

    addPropertyDomainTranslationAbstract(displayObject) {
        //Add the premise
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text("domain(")
            .append("span").attr("class", "text-black").text(r1)
            .append("span").attr("class", "text-green").text(")")
            .append("span").attr("class", "text-black").text(" = " + c1);

        //Add the line
        this.addMidRule(displayObject, [11]);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(r1)
            .append("span").attr("class", "text-green").text(dotTop)
            .append("span").attr("class", "text-black").text(subsumesDisplay + c1);
    }

    intersectionDecomposition(conclusion, tooltip) {
        let lHS, rHS, lHSConjuncts, indexOfMatch;

        let originalConclusion = conclusion;
        // console.log(conclusion.replace(regPar, ""));
        if (conclusion[0] === "(" && conclusion[conclusion.length-1] === ")")
            // conclusion = conclusion.replace(regPar, "");
            conclusion = conclusion.substring(1,conclusion[conclusion.length-1])

        console.log("conclusion after removing outer = " + conclusion)

        //let lHSRaw =  conclusion.split(subsumes)[0].trim();
        
        lHS = conclusion.substring(1, conclusion.indexOf(")")).split(subsumes)[0].trim();
        rHS = conclusion.split(subsumes)[1].trim();
        lHSConjuncts = lHS.split(and);
        console.log(lHSConjuncts)
        lHSConjuncts = lHSConjuncts.map(x => x.trim());
        indexOfMatch = lHSConjuncts.findIndex(x => x === rHS);

        //TODO cut t

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(INTERSECTION_DECOMPOSITION, displayObject);

        //Add rule definition
        this.addIntersectionDecompositionAbstract(indexOfMatch, displayObject);

        let conclusionLength = [conclusion.length];
        this.addSeparator(displayObject, this.getLarger(conclusionLength, INTERSECTION_DECOMPOSITION.length));

        //Add the current instantiation of the rule
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, conclusionLength);

        //Add the conclusion
        let span = displayObject.append("span"), color;
        for (let i = 0; i < lHSConjuncts.length; i++) {
            color = i === indexOfMatch ? "text-green" : "text-black";

            if (i === 0) {
                span.append("span").attr("class", "text-black").text("(")
                    .append("span").attr("class", color).text(lHSConjuncts[i]);
            } else if (i < lHSConjuncts.length - 1) {
                span.append("span").attr("class", color).text(lHSConjuncts[i]);
            } else if (i === lHSConjuncts.length - 1) {
                span.append("span").attr("class", color).text(lHSConjuncts[i])
                    .append("span").attr("class", "text-black").text(")" + subsumesDisplay)
                    .append("span").attr("class", "text-green").text(rHS);
                return;
            }
            span.append("span").attr("class", "text-black").text(andDisplay);
        }
    }

    addIntersectionDecompositionAbstract(indexOfMatch, displayObject) {
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, [11]);

        //Add the conclusion
        let lHSConjuncts = [c1, c2],
            rHS = lHSConjuncts[indexOfMatch],
            span = displayObject.append("span"), color;

        for (let i = 0; i < lHSConjuncts.length; i++) {
            color = i === indexOfMatch ? "text-green" : "text-black";

            if (i === 0) {
                span.append("span").attr("class", "text-black").text("(")
                    .append("span").attr("class", color).text(lHSConjuncts[i]);
            } else if (i < lHSConjuncts.length - 1) {
                span.append("span").attr("class", color).text(lHSConjuncts[i]);
            } else if (i === lHSConjuncts.length - 1) {
                span.append("span").attr("class", color).text(lHSConjuncts[i])
                    .append("span").attr("class", "text-black").text(")" + subsumesDisplay)
                    .append("span").attr("class", "text-green").text(rHS);
                return;
            }
            span.append("span").attr("class", "text-black").text(andDisplay);
        }
    }

    equivalentClassesDecomposition(premise, conclusion, tooltip) {
        let lHS = premise[0].split(equivalence)[0].trim();
        let rHS = premise[0].split(equivalence)[1].trim();

        let flip = lHS !== conclusion.split(subsumes)[0].trim();

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(EQUIVALENT_CLASSES_DECOMPOSITION, displayObject)

        //Add rule definition
        this.addEquivalentClassesDecompositionAbstract(flip, displayObject);

        let premiseLength = [premise[0].length];
        this.addSeparator(displayObject, this.getLarger(premiseLength, EQUIVALENT_CLASSES_DECOMPOSITION.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS)
            .append("span").attr("class", "text-green").text(equivalenceDisplay)
            .append("span").attr("class", "text-black").text(rHS);

        //Add the line
        this.addMidRule(displayObject, premiseLength);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(!flip?lHS:rHS)
            .append("span").attr("class", "text-green").text(subsumesDisplay)
            .append("span").attr("class", "text-black").text(!flip?rHS:lHS);
    }

    addEquivalentClassesDecompositionAbstract(flip, displayObject) {
        let lHS1 = c1;
        let lHS2 = flip ? c2 : c1;
        let rHS1 = c2;
        let rHS2 = flip ? c1 : c2;

        //Add the premise
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS1)
            .append("span").attr("class", "text-green").text(equivalenceDisplay)
            .append("span").attr("class", "text-black").text(rHS1);

        //Add the line
        this.addMidRule(displayObject, [5]);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS2)
            .append("span").attr("class", "text-green").text(subsumesDisplay)
            .append("span").attr("class", "text-black").text(rHS2);
    }

    existentialPropertyExpansion(premise, conclusion, tooltip) {
        let lHS = premise[0].split(subsumes)[0].trim();
        let rHS = premise[0].split(subsumes)[1].trim();

        let filler = conclusion.substring(conclusion.lastIndexOf(".") + 1);

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(EXISTENTIAL_PROPERTY_EXPANSION, displayObject)

        //Add rule definition
        this.addExistentialPropertyExpansionAbstract(displayObject);

        let premiseLength = [premise[0].length];
        this.addSeparator(displayObject, this.getLarger(premiseLength, EXISTENTIAL_PROPERTY_EXPANSION.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("span").attr("class", "text-black").text(premise[0]);

        //Add the line
        this.addMidRule(displayObject, premiseLength);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(lHS)
            .append("span").attr("class", "text-green").text(dot + filler)
            .append("span").attr("class", "text-black").text(subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(rHS)
            .append("span").attr("class", "text-green").text(dot + filler);
    }

    addExistentialPropertyExpansionAbstract(displayObject) {
        //Add the premise
        displayObject
            .append("span").attr("class", "text-black").text("R" + subsumesDisplay + "S");

        //Add the line
        this.addMidRule(displayObject, [11]);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text("R")
            .append("span").attr("class", "text-green").text(dot + c1)
            .append("span").attr("class", "text-black").text(subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text("S")
            .append("span").attr("class", "text-green").text(dot + c1);
    }

    intersectionComposition(premise, tooltip) {
        let lHS = premise[0].split(subsumes)[0];

        let rHSConjunct1 = premise[0].split(subsumes)[1];
        let rHSConjunct2 = premise[1].split(subsumes)[1];

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(INTERSECTION_COMPOSITION, displayObject)

        //Add rule definition
        this.addIntersectionCompositionAbstract(displayObject);

        // let premiseLengths = [premise[0].length, premise[1].length];
        let premiseLengths = [lHS.length + rHSConjunct1.length + rHSConjunct2.length];
        this.addSeparator(displayObject, this.getLarger(premiseLengths, INTERSECTION_COMPOSITION.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("div")//.attr("class","tab")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-red").text(rHSConjunct1);

        displayObject
            .append("div")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-green").text(rHSConjunct2);

        //Add the line
        this.addMidRule(displayObject, premiseLengths);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-red").text(rHSConjunct1)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(rHSConjunct2);
    }

    addIntersectionCompositionAbstract(displayObject) {
        //Add the premise
        displayObject
            .append("div")//.attr("class","tab")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-red").text(c2);

        displayObject
            .append("div")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(c3);

        //Add the line
        this.addMidRule(displayObject, [14]);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-red").text(c2)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(c3);
    }

    existentialFillerExpansion(premise, conclusion, tooltip) {
        let lHS, rHS, roleName;

        lHS = premise[0].split(subsumes)[0].trim();
        rHS = premise[0].split(subsumes)[1].trim();
        roleName = conclusion.substring(1, conclusion.indexOf("."));

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(EXISTENTIAL_FILLER_EXPANSION, displayObject)

        //Add rule definition
        this.addExistentialFillerExpansionAbstract(displayObject);

        let conclusionLength = [conclusion.length];
        this.addSeparator(displayObject, this.getLarger(conclusionLength, EXISTENTIAL_FILLER_EXPANSION.length));

        //Add the current instantiation of the rule
        //Add the premise
        displayObject
            .append("span").attr("class", "text-black").text(premise[0]);

        //Add the line
        this.addMidRule(displayObject, conclusionLength);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(roleName)
            .append("span").attr("class", "text-black").text("." + lHS + subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(roleName)
            .append("span").attr("class", "text-black").text("." + rHS);
    }

    addExistentialFillerExpansionAbstract(displayObject) {
        //Add the premise
        displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c2);

        //Add the line
        this.addMidRule(displayObject, [11]);

        //Add the conclusion
        displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(r1)
            .append("span").attr("class", "text-black").text(dot + c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(r1)
            .append("span").attr("class", "text-black").text(dot + c2);
    }

    disjointClassesTranslation(premise, conclusion, tooltip) {

        let premiseRoleNames = premise[0].match(regBetweenPar)[0].replace(regPar, "").split(",").map(x => x.trim());
        let conclusionRoleNames = conclusion.match(regBetweenPar)[0].replace(regPar, "").split(and).map(x => x.trim());

        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(DISJOINT_CLASSES_TRANSLATION, displayObject)

        //Add rule definition
        this.addDisjointClassesTranslationAbstract(displayObject);

        let premiseLengths = [premise[0].length];
        this.addSeparator(displayObject, this.getLarger(premiseLengths, DISJOINT_CLASSES_TRANSLATION.length));

        //Add the current instantiation of the rule
        //Add the premise
        let x = displayObject.append("span")//.attr("class", "tab");

        x.append("span").attr("class", "text-black").text(disjoint + "(");
        for (let i = 0; i < premiseRoleNames.length; i++) {
            let color = conclusionRoleNames.includes(premiseRoleNames[i]) ? "text-green" : "text-black";

            x = x.append("span").attr("class", color).text(premiseRoleNames[i]);
            if (i < premiseRoleNames.length - 1) {
                x = x.append("span").attr("class", "text-black").text(", ");
            }
        }
        x.append("span").attr("class", "text-black").text(")");

        //Add the line
        this.addMidRule(displayObject, premiseLengths);

        //Add the conclusion
        x = displayObject.append("span");
        x.append("span").attr("class", "text-black").text("(");
        for (let i = 0; i < conclusionRoleNames.length; i++) {
            x = x.append("span").attr("class", "text-green").text(conclusionRoleNames[i]);
            if (i < conclusionRoleNames.length - 1) {
                x = x.append("span").attr("class", "text-black").text(andDisplay);
            }
        }
        x.append("span").attr("class", "text-black").text(")" + subsumesDisplay + bot);
    }

    addDisjointClassesTranslationAbstract(displayObject) {
        displayObject
            .append("span")//.attr("class", "tab")
            .append("span").attr("class", "text-black").text(`${disjoint}(${r1}, ... , `)
            .append("span").attr("class", "text-green ").text(r2)
            .append("span").attr("class", "text-black normal").text(", ")
            .append("span").attr("class", "text-green ").text(r3)
            .append("span").attr("class", "text-black normal").text(`, ... , ${r4})`);

        this.addMidRule(displayObject, [9, 9]);

        displayObject
            .append("span").attr("class", "text-black").text("(")
            .append("span").attr("class", "text-green").text(r2)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(r3)
            .append("span").attr("class", "text-black").text(`)${subsumesDisplay}${bot}`);
    }

    topSuperClass(conclusion, tooltip) {
        displayObject = tooltip.append("span").attr("class", "tooltiptext card-panel")
            .attr("id", "explanationTextSpan");

        //Add a title for the explanation view
        this.addTitle(Top_Super_Class, displayObject);

        //Add rule definition
        this.addTopSuperClassAbstract(displayObject);

        let conclusionLength = [conclusion.length];
        this.addSeparator(displayObject, this.getLarger(conclusionLength, ASSERTED_CONCLUSION.length));

        //Add the current instantiation of the rule
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, conclusionLength);

        //Add the conclusion
        displayObject
            .append("span").attr("class", "text-black").text(conclusion.split(subsumes)[0] + subsumesDisplay)
            .append("span").attr("class", "text-green").text(conclusion.split(subsumes)[1]);
    }

    addTopSuperClassAbstract(displayObject) {
        //Add empty premise
        displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        this.addMidRule(displayObject, [6]);

        //Add the conclusion
        displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green ").text(top);
    }

    addTitle(ruleName, displayObject) {
        let title = displayObject.append("div").attr("class", "card-title")
        title.append("span");//.attr("class", "close")
        title.append("h2").attr("align", "center").text(ruleName);
    }

    addSeparator(displayObject, length) {
        displayObject.append("br")
        displayObject.append("br")
    }

    addMidRule(displayObject, length) {
        displayObject
            .append("hr").attr("class", "mid").attr("width", this.getRuleLength(length));
    }

    getRuleLength(premiseSizes) {
        let length = 0;
        for (let i = 0; i < premiseSizes.length; i++)
            length += (premiseSizes[i] * 10) + 40;

        return length - 40;
    }

    getLarger(premiseSizes, ruleNameLength) {
        let premiseTotalLength = 0;
        for (let i = 0; i < premiseSizes.length; i++)
            premiseTotalLength += premiseSizes[i];

        return premiseTotalLength > ruleNameLength ? premiseSizes : [ruleNameLength];
    }

    getPositionClass(ruleExplanationPosition) {
        if (ruleExplanationPosition === "rightBottom")
            return "positionRB"
        else if (ruleExplanationPosition === "rightTop")
            return "positionRT"
        else if (ruleExplanationPosition === "leftTop")
            return "positionLT"
        return "positionLB"
    }

    setPositionRelativeToMouse(event, tooltip) {
        let element = document.getElementById("explanationTextSpan");

        if (element) {
            let width = element.offsetWidth;
            let height = element.offsetHeight - 35;

            let x = event.clientX + width > app.contentWidth
                ? app.contentWidth - width
                : event.pageX;
            let y = event.clientY + height > app.contentHeight
                ? app.contentHeight - height
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

