import { utils } from "./rules.js";

const subsumes = "⊑", subsumesDisplay = " ⊑ ", 
    exists = "∃", 
    top = "⊤", 
    bot = "⊥",
    dotTop = ".⊤", 
    and = "⊓", andDisplay = " ⊓ ", 
    dot = ".",
    equivalence = "≡", equivalenceDisplay = " ≡ ", 
    disjoint = "disjoint",
    c1 = "Φ", 
    c2 = "Ψ", 
    c3 = "Ω", 
    r1 = "ρ", 
    r2 = "σ", 
    r3 = "λ", 
    r4 = "μ";

export class DLRules {

    displayObject = null;

    rules = {
        "Asserted Conclusion" : (_, c) => this.assertedConclusion(c),
        "Class Hierarchy" : (p, c) => this.classHierarchy(p,c),
        "Existential Property Expansion" : (p, c) => this.existentialPropertyExpansion(p, c),  
        "Intersection Composition" : (p, _) => this.intersectionComposition(p),  
        "Existential Filler Expansion" : (p, c) => this.existentialFillerExpansion(p, c),  
        "Property Domain Translation" : (p, _) => this.propertyDomainTranslation(p),  
        "Intersection Decomposition" : (_, c) => this.intersectionDecomposition(c),  
        "Equivalent Classes Decomposition" : (p, c) => this.equivalentClassesDecomposition(p, c),  
        "Disjoint Classes Translation" : (p, c) => this.disjointClassesTranslation(p, c),  
        "Top Superclass" : (_, c) => this.topSuperClass(c),  
    }

    draw({ div, premises, conclusion, params }) {
        this.displayObject = div;
        const ruleName = params.ruleName;
        
        if (this.rules[ruleName]) {
            utils.addTitle(ruleName);
            this.rules[ruleName](premises, conclusion);
        } else {
            console.error("unknown dl rule");
        }
    }

    classHierarchy(premise, conclusion) {
        function getColors(premiseSize) {
            let colors = [];
            for(let i = 0; i < premiseSize; i+=80){
                colors.push(utils.getColor(i));
            }
            return colors;
        }

        let conLHS, conRHS, premiseAxioms, colors;

        conLHS = conclusion.split(subsumes)[0].trim();
        conRHS = conclusion.split(subsumes)[1].trim();

        function orderAxioms(premise, conLHS) {
            function findIn(lhs, premise, orderedAxioms, visited) {
                for(let i = 0; i < premise.length; i++){
                    if (premise[i].split(subsumes)[0].trim() === lhs){
                        if(visited.includes(premise[i]))
                            break;

                        visited.push(premise[i]);
                        orderedAxioms.push(premise[i]);

                        findIn(premise[i].split(subsumes)[1].trim(), premise, orderedAxioms, visited);
                    }
                }
            }

            let orderedAxioms = [], visited = [];
            findIn(conLHS, premise, orderedAxioms, visited);
            return orderedAxioms;
        }

        premiseAxioms = orderAxioms(premise, conLHS);
        console.log("ordered axioms")
        console.log(premiseAxioms)

        colors = getColors(premiseAxioms.length - 1);
        console.log("colors")
        console.log(colors)

        //Add rule definition
        this.addClassHierarchyAbstract(premiseAxioms.length, colors);

        utils.addSeparator();

        //Add the current instantiation of the rule
        let premiseLengths = []
        let l1,r1;
        for(let i = 0; i < premiseAxioms.length; i++){
            premiseLengths.push(premiseAxioms.length);

            l1 = premiseAxioms[i].split(subsumes)[0].trim();
            r1 = premiseAxioms[i].split(subsumes)[1].trim();

            //Add the premise
            this.displayObject
                .append("span").attr("class", "tab")
                .append("span").style("color", l1 === conLHS?"#000000":colors[i-1]).text(l1)
                .append("span").attr("class", "text-black").text(subsumesDisplay)
                .append("span").style("color", r1 === conRHS?"#000000":colors[i]).text(r1);
        }

        //Add the line
        utils.addMidRule(premiseLengths);

        //Add the conclusion
        this.displayObject
            .append("span").attr("class", "text-black").text(conLHS + subsumesDisplay + conRHS);
    }

    addClassHierarchyAbstract(premiseLengths, colors) {
        let l1,r1;
        for(let i = 0; i < premiseAxioms.length; i++){

            l1 = premiseAxioms[i].split(subsumes)[0].trim();
            r1 = premiseAxioms[i].split(subsumes)[1].trim();

            //Add the premise
            this.displayObject
                .append("span").attr("class", "tab")
                .append("span").style("color", l1 === conLHS?"#000000":colors[i-1]).text(l1)
                .append("span").attr("class", "text-black").text(subsumesDisplay)
                .append("span").style("color", r1 === conRHS?"#000000":colors[i]).text(r1);
        }

        //TODO add an arg for total number of premise elements. If greater than 2, then use c2_1, c2_2 and so on
        this.displayObject
            .append("span").attr("class", "tab")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(c2);

        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(c2)
            .append("span").attr("class", "text-black").text(subsumesDisplay + c3);

        utils.addMidRule(premiseLengths);

        this.displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c3);
    }

    assertedConclusion(conclusion) {

        //Add rule definition
        this.addAssertedConclusionAbstract();

        let conclusionLength = [conclusion.length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule(conclusionLength);

        //Add the conclusion
        this.displayObject
            .append("span").attr("class", "text-black").text(conclusion);
    }

    addAssertedConclusionAbstract() {
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule([6]);

        //Add the conclusion
        this.displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c2);
    }

    propertyDomainTranslation(premise) {
        let roleName = premise[0].substring(premise[0].indexOf("(") + 1, premise[0].indexOf(")")).trim();
        let concept = premise[0].substring(premise[0].indexOf("=") + 1).trim();

        //Add rule definition
        this.addPropertyDomainTranslationAbstract();

        let premiseLength = [premise[0].length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text("domain(")
            .append("span").attr("class", "text-black").text(roleName)
            .append("span").attr("class", "text-green").text(")")
            .append("span").attr("class", "text-black").text(" = " + concept);

        //Add the line
        utils.addMidRule(premiseLength);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(roleName)
            .append("span").attr("class", "text-green").text(dotTop)
            .append("span").attr("class", "text-black").text(subsumesDisplay + concept);
    }

    addPropertyDomainTranslationAbstract() {
        //Add the premise
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text("domain(")
            .append("span").attr("class", "text-black").text(r1)
            .append("span").attr("class", "text-green").text(")")
            .append("span").attr("class", "text-black").text(" = " + c1);

        //Add the line
        utils.addMidRule([11]);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(r1)
            .append("span").attr("class", "text-green").text(dotTop)
            .append("span").attr("class", "text-black").text(subsumesDisplay + c1);
    }

    intersectionDecomposition(conclusion) {
        let lHS, rHS, lHSConjuncts, indexOfMatch;

        // console.log(conclusion.replace(regPar, ""));
        if (conclusion[0] === "(" && conclusion[conclusion.length-1] === ")")
            // conclusion = conclusion.replace(regPar, "");
            conclusion = conclusion.substring(1,conclusion[conclusion.length-1])

        console.log("conclusion after removing outer = " + conclusion)

        //let lHSRaw =  conclusion.split(subsumes)[0].trim();
        
        lHS = conclusion.substring(1, conclusion.indexOf(")")).split(subsumes)[0].trim();
        rHS = conclusion.split(subsumes)[1].trim();
        lHSConjuncts = lHS.split(and);
        lHSConjuncts = lHSConjuncts.map(x => x.trim());
        indexOfMatch = lHSConjuncts.findIndex(x => x === rHS);

        //TODO cut t

        //Add rule definition
        this.addIntersectionDecompositionAbstract(indexOfMatch);

        let conclusionLength = [conclusion.length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule(conclusionLength);

        //Add the conclusion
        let span = this.displayObject.append("span"), color;
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

    addIntersectionDecompositionAbstract(indexOfMatch) {
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule([11]);

        //Add the conclusion
        let lHSConjuncts = [c1, c2],
            rHS = lHSConjuncts[indexOfMatch],
            span = this.displayObject.append("span"), color;

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

    equivalentClassesDecomposition(premise, conclusion) {
        let lHS = premise[0].split(equivalence)[0].trim();
        let rHS = premise[0].split(equivalence)[1].trim();

        let flip = lHS !== conclusion.split(subsumes)[0].trim();

        //Add rule definition
        this.addEquivalentClassesDecompositionAbstract(flip, this.displayObject);

        let premiseLength = [premise[0].length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS)
            .append("span").attr("class", "text-green").text(equivalenceDisplay)
            .append("span").attr("class", "text-black").text(rHS);

        //Add the line
        utils.addMidRule(premiseLength);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(!flip?lHS:rHS)
            .append("span").attr("class", "text-green").text(subsumesDisplay)
            .append("span").attr("class", "text-black").text(!flip?rHS:lHS);
    }

    addEquivalentClassesDecompositionAbstract(flip) {
        let lHS1 = c1;
        let lHS2 = flip ? c2 : c1;
        let rHS1 = c2;
        let rHS2 = flip ? c1 : c2;

        //Add the premise
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS1)
            .append("span").attr("class", "text-green").text(equivalenceDisplay)
            .append("span").attr("class", "text-black").text(rHS1);

        //Add the line
        utils.addMidRule([5]);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS2)
            .append("span").attr("class", "text-green").text(subsumesDisplay)
            .append("span").attr("class", "text-black").text(rHS2);
    }

    existentialPropertyExpansion(premise, conclusion) {
        let lHS = premise[0].split(subsumes)[0].trim();
        let rHS = premise[0].split(subsumes)[1].trim();
        let filler = conclusion.substring(conclusion.lastIndexOf(".") + 1);

        //Add rule definition
        this.addExistentialPropertyExpansionAbstract();

        let premiseLength = [premise[0].length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        this.displayObject
            .append("span").attr("class", "text-black").text(premise[0]);

        //Add the line
        utils.addMidRule(premiseLength);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(lHS)
            .append("span").attr("class", "text-green").text(dot + filler)
            .append("span").attr("class", "text-black").text(subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text(rHS)
            .append("span").attr("class", "text-green").text(dot + filler);
    }

    addExistentialPropertyExpansionAbstract() {
        //Add the premise
        this.displayObject
            .append("span").attr("class", "text-black").text("R" + subsumesDisplay + "S");

        //Add the line
        utils.addMidRule([11]);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text("R")
            .append("span").attr("class", "text-green").text(dot + c1)
            .append("span").attr("class", "text-black").text(subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-black").text("S")
            .append("span").attr("class", "text-green").text(dot + c1);
    }

    intersectionComposition(premise) {
        let lHS = premise[0].split(subsumes)[0];

        let rHSConjunct1 = premise[0].split(subsumes)[1];
        let rHSConjunct2 = premise[1].split(subsumes)[1];

        //Add rule definition
        this.addIntersectionCompositionAbstract();

        // let premiseLengths = [premise[0].length, premise[1].length];
        let premiseLengths = [lHS.length + rHSConjunct1.length + rHSConjunct2.length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        this.displayObject
            .append("div")//.attr("class","tab")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-red").text(rHSConjunct1);

        this.displayObject
            .append("div")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-green").text(rHSConjunct2);

        //Add the line
        utils.addMidRule(premiseLengths);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(lHS + subsumesDisplay)
            .append("span").attr("class", "text-red").text(rHSConjunct1)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(rHSConjunct2);
    }

    addIntersectionCompositionAbstract() {
        //Add the premise
        this.displayObject
            .append("div")//.attr("class","tab")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-red").text(c2);

        this.displayObject
            .append("div")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(c3);

        //Add the line
        utils.addMidRule([14]);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-red").text(c2)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(c3);
    }

    existentialFillerExpansion(premise, conclusion) {
        let lHS, rHS, roleName;

        lHS = premise[0].split(subsumes)[0].trim();
        rHS = premise[0].split(subsumes)[1].trim();
        roleName = conclusion.substring(1, conclusion.indexOf("."));

        //Add rule definition
        this.addExistentialFillerExpansionAbstract();

        let conclusionLength = [conclusion.length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        this.displayObject
            .append("span").attr("class", "text-black").text(premise[0]);

        //Add the line
        utils.addMidRule(conclusionLength);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(roleName)
            .append("span").attr("class", "text-black").text("." + lHS + subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(roleName)
            .append("span").attr("class", "text-black").text("." + rHS);
    }

    addExistentialFillerExpansionAbstract() {
        //Add the premise
        this.displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay + c2);

        //Add the line
        utils.addMidRule([11]);

        //Add the conclusion
        this.displayObject
            .append("span")
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(r1)
            .append("span").attr("class", "text-black").text(dot + c1 + subsumesDisplay)
            .append("span").attr("class", "text-green").text(exists)
            .append("span").attr("class", "text-red").text(r1)
            .append("span").attr("class", "text-black").text(dot + c2);
    }

    disjointClassesTranslation(premise, conclusion) {
        const regBetweenPar = /\([^)]+\)/g, regPar = /[()]/g;

        let premiseRoleNames = premise[0].match(regBetweenPar)[0].replace(regPar, "").split(",").map(x => x.trim());
        let conclusionRoleNames = conclusion.match(regBetweenPar)[0].replace(regPar, "").split(and).map(x => x.trim());

        //Add rule definition
        this.addDisjointClassesTranslationAbstract();

        let premiseLengths = [premise[0].length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add the premise
        let x = this.displayObject.append("span")//.attr("class", "tab");

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
        utils.addMidRule(premiseLengths);

        //Add the conclusion
        x = this.displayObject.append("span");
        x.append("span").attr("class", "text-black").text("(");
        for (let i = 0; i < conclusionRoleNames.length; i++) {
            x = x.append("span").attr("class", "text-green").text(conclusionRoleNames[i]);
            if (i < conclusionRoleNames.length - 1) {
                x = x.append("span").attr("class", "text-black").text(andDisplay);
            }
        }
        x.append("span").attr("class", "text-black").text(")" + subsumesDisplay + bot);
    }

    addDisjointClassesTranslationAbstract() {
        this.displayObject
            .append("span")//.attr("class", "tab")
            .append("span").attr("class", "text-black").text(`${disjoint}(${r1}, ... , `)
            .append("span").attr("class", "text-green ").text(r2)
            .append("span").attr("class", "text-black normal").text(", ")
            .append("span").attr("class", "text-green ").text(r3)
            .append("span").attr("class", "text-black normal").text(`, ... , ${r4})`);

        utils.addMidRule([9, 9]);

        this.displayObject
            .append("span").attr("class", "text-black").text("(")
            .append("span").attr("class", "text-green").text(r2)
            .append("span").attr("class", "text-black").text(andDisplay)
            .append("span").attr("class", "text-green").text(r3)
            .append("span").attr("class", "text-black").text(`)${subsumesDisplay}${bot}`);
    }

    topSuperClass(conclusion) {

        //Add rule definition
        this.addTopSuperClassAbstract();

        let conclusionLength = [conclusion.length];
        utils.addSeparator();

        //Add the current instantiation of the rule
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule(conclusionLength);

        //Add the conclusion
        this.displayObject
            .append("span").attr("class", "text-black").text(conclusion.split(subsumes)[0] + subsumesDisplay)
            .append("span").attr("class", "text-green").text(conclusion.split(subsumes)[1]);
    }

    addTopSuperClassAbstract() {
        //Add empty premise
        this.displayObject
            .append("p").style("margin-bottom", ".8cm");

        //Add the line
        utils.addMidRule([6]);

        //Add the conclusion
        this.displayObject
            .append("span").attr("class", "text-black").text(c1 + subsumesDisplay)
            .append("span").attr("class", "text-green ").text(top);
    }
}
