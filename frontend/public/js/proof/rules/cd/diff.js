import { utils } from "../rules.js";
import { text, controls, createVisContainer } from "./cd-rules.js";
import { stylesheet } from "../../../../style/cy-cd-style.js";
import { params as cola } from "../../../layouts/cola.js";

const EPSILON = " - Є";
const EPSILONS = (n) => n === 0 ? "" : (n === 1 ? EPSILON : ` - ${n}Є`);

export class DifferenceCD {
    
    showObvious = false;

    types = {
        "plus": "=",
        "equal": "=",
        "greaterThan": ">",
        "lessThan": "<",
        "lessOrEqualThan": "≤",
        "greaterOrEqualThan": "≥",
    }

    rules = {
        "[Different constants]": "R/=",
        "[Different differences]": "R /= +",
        "[Constant too small]": "R<",
        "[Sum of differences]": "R+",
        "[Constant difference]": "R-",
        "[Propagate =]": "R=",
        "[Tautology]": "R0",
        "[Invert]": "R<->",
        "[Propagate >]": "R>",
        "[Introduce >]": "Introduce >",
        "[Weaken >]": "Weaken >",
        "[From ⊥]": "From ⊥",
    }

    isDifference(name) {
        return this.rules[name];
    }

    async draw(data, name, params, where) {
        const ruleName = this.rules[name]
        function displayRule(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printTerms(terms, where) {
                let first = true;
                Object.keys(terms).forEach(variable => {
                    const term = terms[variable];

                    if (term.includes(EPSILON)) {
                        where.append("span").attr("class", "text-black").text(term);
                        length += term.length;
                        return;
                    } 
                        
                    if (!showObvious && eval(term) === 0 && variable !== "constant") {
                        return; // don't print, don't set first to false
                    }

                    const plus = first ? "" : " + ";
                    where.append("span").attr("class", "text-black").text(plus);
                    length += plus.length;

                    if (!showObvious && (eval(term) !== 1 || variable === "constant")) {
                        if (eval(term) === -1 && variable !== "constant") {
                            where.append("span").attr("class", "text-black").text("-");
                            length += 1;
                        } else {
                            where.append("span").attr("class", "text-black").text(term);
                            length += term.length;
                        }
                    }

                    if (variable !== "constant") {
                        where.append("span").attr("class", "text-green").text(variable);
                    }

                    length += variable.length;
                    first = false;
                });
            }

            exp.append("span").attr("class", "text-red").text("[" + ruleName + "] ");

            op.premises.forEach((pr, i) => {
                if (i !== 0) {
                    exp.append("span").attr("class", "tab");
                }

                if (pr.constraint.bottom) {
                    exp.append("span")
                        .attr("id", "eq-" + pr.bottom.id)
                        .attr("class", "text-red").text("⊥")
                } else {
                    const constraint = exp.append("span").attr("id", "eq-" + pr.id);
                    printTerms(pr.constraint.lhs, constraint);
                    constraint.append("span").attr("class", "text-black").text(" " + types[pr.constraint.type] + " ");
                    printTerms(pr.constraint.rhs, constraint);
                }
            });

            utils.addMidRule([length + name.length], exp);
            if (op.conclusion.constraint.bottom) {
                exp.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-red").text("⊥");
            } else {
                const constraint = exp.append("span").attr("id", "eq-" + op.conclusion.id);
                printTerms(op.conclusion.constraint.lhs, constraint);
                constraint.append("span").attr("class", "text-black").text(" " + types[op.conclusion.constraint.type] + " ");
                printTerms(op.conclusion.constraint.rhs, constraint);

                if (op.conclusion.negs.length > 0) {
                    const neg = exp.append("span")
                        .attr("class", "text-black")
                        .style("display", "block")
                        .style("text-align", "left")
                    neg.append("br");
                    neg.append("span").attr("class", "tab");
                    neg.append("span").attr("class", "text-black").text("Negation of Conclusion:");

                    op.conclusion.negs.forEach((c, i) => {
                        const cons = neg.append("span").attr("id", "eq-" + op.conclusion.id+ "-n"+i);
                        cons.append("br");
                        cons.append("span").attr("class", "tab");
                        cons.append("span").attr("class", "tab");
                        printTerms(c.lhs, cons);
                        cons.append("span").attr("class", "text-black").text(" " + types[c.type] + " ")
                        printTerms(c.rhs, cons);
                    })

                    neg.append("br");
                    neg.append("span").attr("class", "tab");
                    neg.append("span").attr("class", "text-black").text("Negative Cycle Value: ");
                    neg.append("span").attr("class", "text-red").attr("id", "cycle-val").text("0");   
                    neg.append("br");
                    neg.append("span").attr("class", "tab");
                }
            }
        }

        function getDiffGrammarEqs(op) {
            // expects x = c, x > c, x + c = y
            const edges = [];
            const nodes = {};
            const x0 = "x0";
            
            const constraints = [
                ...op.premises.map(p => p.constraint),
                ...op.conclusion.negs
            ].filter(p => !p.bottom);
            let i = 1;

            constraints.forEach(p => {
                const lhs = structuredClone(p.lhs);
                const rhs = structuredClone(p.rhs);

                if (rhs.constant) {
                    const minusEp = rhs.constant.includes(EPSILON);
    
                    rhs.epsilon = "";
                    if (minusEp) {
                        rhs.epsilon = EPSILON;
                        rhs.constant = rhs.constant.split(rhs.epsilon)[0];
                    }
                }
                
                if (p.type === "plus") { // x+c=y is the same as y-x=c
                    const c = +lhs.constant;
                    delete lhs.constant;
                    const x = Object.keys(lhs)[0];
                    const y = Object.keys(rhs)[0];

                    // x−y=c is the same as x-y<=c ; y-x<=-c
                    // for x-y <= c, edge is (y,x) with weight c 
                    nodes[x] = nodes[x] || i++;
                    nodes[y] = nodes[y] || i++;
                    edges.push({
                        data: {
                            id: i++,
                            source: nodes[x], target: nodes[y], label: c, weight: c
                        } // x-y<=c : (y,x),c 
                    });
                    edges.push({
                        data: {
                            id: i++,
                            source: nodes[y], target: nodes[x], label: -c, weight: -c
                        } // y-x<=-c : (x,y),-c 
                    });
                } else if (p.type === "equal" || p.type === "lessThan" || p.type === "lessOrEqualThan") { // x = c || x < c
                    // x < c can be rewritten as x−x0 < c
                    const x = Object.keys(lhs)[0];
                    const c = +rhs.constant;

                    nodes[x] = nodes[x] || i++;
                    nodes[x0] = nodes[x0] || i++;

                    if (lhs[x] < 0) {
                        edges.push({
                            data: {
                                id: i++,
                                source: nodes[x], 
                                target: nodes[x0], 
                                weight: c - (rhs.epsilon !== "" ? 0.0001 : 0), 
                                label: `${c}${rhs.epsilon}`
                            } // y-x<=-c : (x,y),c 
                        });    
                    } else {
                        edges.push({
                            data: {
                                id: i++,
                                source: nodes[x0], 
                                target: nodes[x], 
                                weight: c - (rhs.epsilon !== "" ? 0.0001 : 0), 
                                label: `${c}${rhs.epsilon}`
                            } // x-y<=c : (y,x),c 
                        });
                    }
                    
                    if (p.type === "equal") {
                        edges.push({
                            data: {
                                id: i++,
                                source: nodes[x], target: nodes[x0], weight: -c - (rhs.epsilon !== "" ? 0.0001 : 0), label: `${-c}${rhs.epsilon}`
                            } // include opposite edge
                        });
                    }
                } else if (p.type === "greaterThan") { // x > c
                    // x > c can be rewritten as x−x0 > c
                    // x−y > c is the same as y−x < −c
                    const x = Object.keys(lhs)[0];
                    const c = +rhs.constant;

                    nodes[x] = nodes[x] || i++;
                    nodes[x0] = nodes[x0] || i++;

                    edges.push({
                        data: {
                            id: i++,
                            source: nodes[x], target: nodes[x0], label: -c, weight: -c
                        } // y−x < −c.
                    });
                } else { 
                    console.error(`inequation ${p.type} not supported!`);
                }

                // x − y >= c is the same as y − x <= −c. This is not considered and should not happen!
            });

            const cynodes = Object.keys(nodes).map(n => {
                return {
                    data: {
                        id: nodes[n],
                        v: n,
                        w: n.length * 4.5
                    }
                }
            });
            return { nodes: cynodes, edges };
        }

        let timeout;
        function animateNegativeCycle(cy) {
            const edges = new Set();
            const nodes = new Set(); 

            clearTimeout(timeout);
            cy.elements().removeClass("highlighted");
            d3.select("#cycle-val").text("0");

            const l = cy.elements("node").length;
            
            if (l > 0) {
                const start = cy.elements("node")[Math.floor(Math.random() * (l))] // starts at random node 
                const bf = cy.elements().bellmanFord({ 
                    root: `#${start.data().id}`, 
                    directed: true,
                    findNegativeWeightCycles: true, 
                    weight: (edge) => edge.data().weight
                });

                if (bf.hasNegativeWeightCycle) {
                    const ncycle = bf.negativeWeightCycles[0].filter(el => el.group() === "edges");
                    let i = 0, ep = 0, cycleValue = 0, current;
                    const highlightNextEle = function () {
                        current = ncycle[i];
                        current.addClass("highlighted");
                        const label = `${current.data().label}`;

                        if (label.includes(EPSILON)) {
                            cycleValue += eval(current.data().label.split(EPSILON)[0]);
                            ep = 1;
                        } else {
                            cycleValue += eval(current.data().label);
                        }
                        
                        d3.select("#cycle-val").text(`${cycleValue}${EPSILONS(ep)}`);
                        i+=1;
                        if (i < ncycle.length) {
                            timeout = setTimeout(highlightNextEle, 1000);
                        }
                    };
                    timeout = setTimeout(highlightNextEle, 1000);
                } else {
                    console.error("negative weight cycle could not be detected");
                }
            }
        }

        utils.addTitle("Difference Logic: " + ruleName);

        let current = 0;
        
        const text_data = text(data);
        const exp = createVisContainer(params, where, 100 + 25*text_data[current].conclusion.negs.length);
        const showObvious = this.showObvious;
        const types = this.types;

        displayRule(text_data[current]);
        const graph = getDiffGrammarEqs(text_data[current], types);
        const container = document.getElementById("explanation-container");
        container.innerHTML = "";

        const cyp = structuredClone(cola);
        cyp.animate = false;
        const cy = cytoscape({
            container,
            style: stylesheet,
            layout: cyp,
            wheelSensitivity: 0.3,
            elements: graph,
        });
        cy.fit();
        
        animateNegativeCycle(cy);
        controls({
            prevFn: (e, d) => {
                
            },
            currentFn: () => {
                animateNegativeCycle(cy);
            },
            nextFn: (e, d) => {
                
            },
            replayFn: (e, d) => {
                animateNegativeCycle(cy);
            },
        }, where, params)
    }
}