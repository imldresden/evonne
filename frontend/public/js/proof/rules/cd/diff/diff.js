import { utils } from "../../rules.js";
import { controls, createVisContainer } from "../cd-rules.js";
import { stylesheet } from "../../../../../style/cy-cd-style.js";
import { params as cola } from "../../../../layouts/cola.js";
import { negativeWeightHamilton } from "./hamiltonian-cycle.js";
import { throttle } from "../../../../utils/throttle.js";

const ZERO = "(0)";
const EPSILON = " - Є";
const EPSILONS = (n) => n === 0 ? "" : (n === 1 ? ` -Є` : ` -${n}Є`);

let timeout;

function f(number) {
    return Fraction(number).toFraction();
}

function ineqGraphHighlight (ev) {
    const eid = ev.detail.eid; 
    d3.selectAll(".text-eq").classed("hl-text", false);
    d3.select(`#${eid}`).classed("hl-text", true);

    const cy = ev.detail.cy;
    const target = ev.detail.target;
    if (cy) {
        cy.elements().removeClass("thick");
        if (target) {
            target.addClass("thick");
        } else {
            cy.elements().filter(e => e.data().eid === eid).addClass("thick");
        }
    }
}

function undoGraphHighlight (ev) { 
    d3.selectAll(".text-eq").classed("hl-text", false);
    const cy = ev.detail.cy;
    if (cy) {
        cy.elements().removeClass("thick");
    }
}

export class DifferenceCD {

    showObvious = false;

    types = {
        "plus": "=",
        "equal": "=",
        "greaterThan": ">",
        "lessThan": "<",
        "lessThanOrEqualTo": "≤",
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

    isDifference(data) {
        return data && data.ops && Object.values(data.ops)[0].domain === 'diff';
    }

    async draw(data, params, where) {
        const getRuleName = (rn) => {
            if (params.isSubProof && params.subProof.name) {
                return `Negative Cycle - ${params.subProof.name}`;
            }
            return this.rules[rn] && `[${this.rules[rn]}]` !== rn ? `${rn} (${this.rules[rn]})` : rn
        }
        let cy;
        
        function displayRule(op) {
            input.selectAll("*").remove();
            output.selectAll("*").remove();

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

                    const plus = first ? "" : (eval(term) < 0 ? " " : " + ");
                    where.append("span").attr("class", "text-black").text(plus);
                    length += plus.length;

                    if (!showObvious && (eval(term) !== 1 || variable === "constant")) {
                        if (eval(term) === -1 && variable !== "constant") {
                            where.append("span").attr("class", "text-black").text("- ");
                            length += 1;
                        } else {
                            if (eval(term) < 0) {
                                where.append("span").attr("class", "text-black").text("- ");
                                length += 1;
                            }
                            where.append("span").attr("class", "text-black").text(Math.abs(term));
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

            const premisesBox = input.append("div").attr('class', 'premises-box')
            premisesBox.append("span").text("Premises:")
            premisesBox.append("br");

            op.premises.forEach((pr, i) => {
                if (i !== 0) {
                    premisesBox.append("br");
                }

                premisesBox.append("span").attr("class", "tab");
                
                if (pr.constraint.bottom) {
                    premisesBox.append("span").attr("class", "tab");
                    premisesBox.append("span").attr("id", `eq-${pr.bottom.id}`).attr("class", "text-red").text("⊥");
                } else {
                    const cid = `eq-${pr.id}`;
                    const constraint = premisesBox.append("span")
                        .attr("id", cid)
                        .attr("class", "text-eq premise")
                        .on('mouseover', ()=> dispatchHighlightCustomEvent(cid))
                        .on('mouseout', ()=> dispatchHighlightCustomEvent(cid))
                        .on('click', ()=> animateNegativeCycle(cy, { sid: cid, nid: params.manual?.id }));
                    printTerms(pr.constraint.lhs, constraint);
                    constraint.append("span").attr("class", "text-black").text(" " + types[pr.constraint.type] + " ");
                    printTerms(pr.constraint.rhs, constraint);
                }
            });

            if (op.conclusion.constraint.bottom) {
                output.append("br");
                output.append("br");
                output.append("span").text("Conclusion:");
                output.append("br");
                output.append("span").attr("class", "tab");
                output.append("span").attr("id", `eq-${op.conclusion.id}`).attr("class", "text-red").text("⊥");
            } else {
                output.append("br");
                output.append("br");
                output.append("span").text("Conclusion:");
                output.append("br");
                output.append("span").attr("class", "tab");
                const cid = `eq-${op.conclusion.id}`;
                const constraint = output.append("span")
                    .attr("id", cid)
                    .attr("class", "text-eq conclusion"); // no hover event because only negations appear in ineq graph

                printTerms(op.conclusion.constraint.lhs, constraint);
                constraint.append("span").attr("class", "text-black").text(" " + types[op.conclusion.constraint.type] + " ");
                printTerms(op.conclusion.constraint.rhs, constraint);

                if (op.conclusion.negs.length > 0) {
                    const neg = output;
                    neg.append("br")
                    neg.append("span").text("Negated:");

                    op.conclusion.negs.forEach((c, i) => {
                        const ncid = `eq-${op.conclusion.id}-n${i}`;
                        const cons = neg.append("span")
                            .attr("id", ncid)
                            .attr("class", "text-eq conclusion")
                            .on('mouseover', () => dispatchHighlightCustomEvent(ncid))
                            .on('mouseout', () => dispatchUndoHighlightCustomEvent(ncid))
                            .on('click', ()=> animateNegativeCycle(cy, { sid: ncid, nid: params.manual?.id }));
                        cons.append("br");
                        cons.append("span").attr("class", "tab");
                        printTerms(c.lhs, cons);
                        cons.append("span").attr("class", "text-black").text(" " + types[c.type] + " ")
                        printTerms(c.rhs, cons);
                    });
                } else {
                    console.error("no conclusion negation found for non-⊥ conclusion")
                }
            }

            const negCValue = output.append("span")
                .attr("class", "text-black")
                .style("display", "block")
                .style("text-align", "left")
            negCValue.append("br");
            negCValue.append("span").attr("class", "text-black").text("Cycle Value: ");
            negCValue.append("span").attr("class", "text-red").attr("id", "cycle-val").text("0");
        }

        function getDiffGrammarEqs(op) {
            // expects x = c, x > c, x + c = y
            const edges = [];
            const nodes = {};
            const x0 = ZERO;

            const constraints = [
                ...op.premises.map(p => { 
                    p.constraint.eid = `eq-${p.id}`; 
                    return p.constraint; 
                }),
                ...op.conclusion.negs.map((n,i) => { 
                    n.negated = true; 
                    n.eid = `eq-${op.conclusion.id}-n${i}`
                    return n; 
                })
            ].filter(p => !p.bottom);
            let i = 1;

            constraints.forEach(p => {
                const lhs = structuredClone(p.lhs);
                const rhs = structuredClone(p.rhs);
                let _epsilon = "";
                if (rhs.constant) {
                    const minusEp = rhs.constant.includes(EPSILON);

                    if (minusEp) {
                        _epsilon = EPSILON;
                        rhs.constant = rhs.constant.split(_epsilon)[0];
                    }
                }

                const negated = p.negated;

                if (p.type === "plus") { // x+c=y is the same as y-x=c
                    const c = +lhs.constant;
                    delete lhs.constant;
                    const x = Object.keys(lhs)[0];
                    const y = Object.keys(rhs)[0];
                    if (Object.keys(lhs).length > 1 || Object.keys(rhs).length > 1) {
                        console.error("wrong format!")
                    }

                    // x−y=c is the same as x-y<=c ; y-x<=-c
                    // for x-y <= c, edge is (y,x) with weight c 
                    nodes[x] = nodes[x] || `n-${i++}`;
                    nodes[y] = nodes[y] || `n-${i++}`;
                    edges.push({
                        data: {
                            id: `e-${i++}`, eid: p.eid,
                            source: nodes[x], target: nodes[y],
                            label: c, weight: c, negated
                        } // x-y<=c : (y,x),c 
                    });
                    edges.push({
                        data: {
                            id: `e-${i++}`, eid: p.eid,
                            source: nodes[y], target: nodes[x],
                            label: -c, weight: -c, negated
                        } // y-x<=-c : (x,y),-c 
                    });
                } else if (p.type === "equal" || p.type === "lessThan") { // x = c || x < c
                    // x < c can be rewritten as x−x0 < c
                    const x = Object.keys(lhs)[0];
                    const c = +rhs.constant;

                    if (Object.keys(lhs).length > 1 || Object.keys(rhs).length > 1) {
                        console.error("wrong format!");
                    }

                    nodes[x] = nodes[x] || `n-${i++}`;
                    nodes[x0] = nodes[x0] || `n-${i++}`;

                    edges.push({
                        data: {
                            id: `e-${i++}`, eid: p.eid,
                            source: nodes[x0], target: nodes[x],
                            label: c, weight: c, negated
                        } // x-y<=c : (y,x) c 
                    });

                    if (p.type === "equal") {
                        edges.push({
                            data: {
                                id: `e-${i++}`, eid: p.eid,
                                source: nodes[x], target: nodes[x0],
                                label: -c, weight: -c, negated
                            } // include opposite edge: (x,y)-c
                        });
                    }
                } else if (p.type === "greaterThan") { // x > c
                    // x > c can be rewritten as x−x0 > c 
                    // x−y > c is the same as y−x <= −c
                    const x = Object.keys(lhs)[0];
                    const c = +rhs.constant;

                    nodes[x] = nodes[x] || `n-${i++}`;
                    nodes[x0] = nodes[x0] || `n-${i++}`;

                    edges.push({
                        data: {
                            id: `e-${i++}`, eid: p.eid,
                            source: nodes[x], target: nodes[x0],
                            label: -c, weight: -c, negated
                        } // y−x < −c  ... (x, y) -c 
                    });
                } else if (p.type === "lessThanOrEqualTo") { // (-) x <= c (-e) OR x - y <= c (-e)
                    const klhs = Object.keys(lhs);
                    if (klhs.length === 1) {
                        const x = klhs[0];
                        const c = +rhs.constant;

                        nodes[x] = nodes[x] || `n-${i++}`;
                        nodes[x0] = nodes[x0] || `n-${i++}`;

                        const edge = {
                            id: `e-${i++}`, eid: p.eid,
                            label: `${c}${_epsilon}`,
                            epsilon:_epsilon,
                            weight: c,
                            negated
                        }

                        if (lhs[x] < 0) {
                            edge.source = nodes[x];
                            edge.target = nodes[x0];
                            // x0−x <= c ... (x, x0) c
                        } else {
                            edge.source = nodes[x0];
                            edge.target = nodes[x];
                            // x-x0 <= c ... (x0, x) c
                        }
                        edges.push({ data: edge });
                    } else if (klhs.length === 2) {
                        const x = klhs[0];
                        const y = klhs[1];
                        const c = +rhs.constant;

                        nodes[x] = nodes[x] || `n-${i++}`;
                        nodes[y] = nodes[y] || `n-${i++}`;

                        edges.push({
                            data: {
                                id: `e-${i++}`, eid: p.eid, negated,
                                source: nodes[y], target: nodes[x],
                                label: `${c}${_epsilon}`,
                                epsilon: _epsilon,
                                weight: c,
                            } // x−y <= c  ... (y, x) c
                        });
                    } else {
                        console.error("wrong format!");
                    }
                } else {
                    console.error(`inequation ${p.type} not supported!`);
                }

                // x − y >= c is the same as y − x < −c. This is not considered and should not happen!
            });

            const cynodes = Object.keys(nodes).map(n => {
                return {
                    data: {
                        id: nodes[n],
                        v: n,
                        og: n, 
                        w: n.length * 4.5
                    }
                }
            });
            return { nodes: cynodes, edges };
        }

        function strip(number) {
            // absolutely unbelievable
            return parseFloat(number).toPrecision(12)/1;
        }

        function animateNegativeCycle(cy, startId = {}) {
            clearTimeout(timeout);
            cy.elements().removeClass("highlighted");
            d3.select("#cycle-val").text("0");

            const l = cy.elements("node").length;

            function sortCycleEdges(edges, startId) {
                let s = edges[0]; 
                if (startId.sid) {
                    const sp = edges.filter(e => e.data().eid === startId.sid); 
                    if (sp.length === 1) { 
                        s = sp[0];
                    }
                }  

                if (startId.nid) {
                    const sp = edges.filter(e => e.data().source === startId.nid); 
                    if (sp.length === 1) { 
                        s = sp[0];
                    }
                }
                
                const r = [s];
                while (edges.length !== r.length) {
                    const next = edges.filter(e => e.data().source === s.data().target)[0];
                    r.push(next);
                    s = next;
                }
                return r;
            }

            if (l > 0) {
                let start;
                if (startId.nid) {
                    start = cy.nodes(`#${startId.nid}`)
                } else {
                    start = cy.nodes()[Math.floor(Math.random() * (l))]; // starts at random node 
                }
                
                const hC = negativeWeightHamilton({
                    root: `#${start.data().id}`,
                    directed: true,
                    weight: (edge) => edge.data().weight,
                }, cy.elements());

                let cycle = hC.cycle; 
                let cWeight = strip(hC.weight)
                if (cWeight > 0) {
                    console.error("hamiltonian cycle not negative")
                } else if (cWeight === 0) {
                    const epsilonCheck = cycle.filter(e => (""+e.data().label).includes(EPSILON));
                    if (!epsilonCheck) {
                        console.error("hamiltonian cycle not negative")
                    }
                }

                const ncycle = sortCycleEdges(cycle, startId);

                let i = 0, ep = 0, cycleValue = Fraction(0), current;

                const highlightNextEle = function () {
                    current = ncycle[i];
                    current.addClass("highlighted");
                    const label = `${current.data().label}`;
                    
                    
                    const n = cy.nodes(`#${current.data().source}`);
                    const _og = n.data().og;
                    if (n.data().og) {
                        n.data({og: _og, v: _og});
                    }

                    if (startId.nid) {
                        const og = n.data().og ? n.data().og : n.data().v;
                        const fv = Fraction(params.manual.value).add(Fraction(cycleValue));
                        const cv = `${f(fv)}${EPSILONS(ep)}`;

                        n.data({og, v: `${n.data().v} ${i === 0 ? '=' : '<=' } ${cv}`})

                        if (og === ZERO && cv !== "0" && fv.lte(0)) {
                            n.addClass("highlighted");
                        }
                    }

                    if (label.includes(EPSILON)) {
                        cycleValue = cycleValue.add(
                            Fraction(current.data().label.split(EPSILON)[0])
                        );
                        ep = 1;
                    } else {
                        cycleValue = cycleValue.add(
                            Fraction(current.data().label)
                        );
                    }

                    if (ep !== 0) {
                        d3.select("#cycle-val").text(`${
                            !Fraction(cycleValue).equals(0) ? f(cycleValue) : ""
                        }${EPSILONS(ep)}`);
                    } else {
                        d3.select("#cycle-val").text(`${f(cycleValue)}${EPSILONS(ep)}`);
                    }
                    
                    i += 1;
                    if (i < ncycle.length) {
                        timeout = setTimeout(highlightNextEle, 1000);
                    } else {
                        setTimeout(() => {
                            if (startId.nid) {
                                const sn = cy.nodes(`#${startId.nid}`);
                                const og = sn.data().og ? sn.data().og : sn.data().v;
                                sn.data({
                                    og, 
                                    v: `${sn.data().v} <= ${
                                        f(Fraction(params.manual.value)
                                            .add(Fraction(cycleValue))
                                        )
                                    }${EPSILONS(ep)}`
                                })
                                sn.addClass("highlighted");
                            } 
                        }, 1000);
                    }
                };
                timeout = setTimeout(highlightNextEle, 1000);
                
            }
        }

        function getHeight(data) {
            return 24 + 24 * data.ops[data.current].premises.length; // each span line is 24 pixels high
        }

        function drawGraph(data) {
            displayRule(data);
            const graph = getDiffGrammarEqs(data, types);
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

            cy.edges()
                .on("tapdragover", e => {
                    dispatchHighlightCustomEvent(e.target.data().eid, e.target)
                })
                .on("tapdragout", e => {
                    dispatchUndoHighlightCustomEvent(e.target.data().eid);
                })     
                .filter(e => e.data().negated).addClass("negated");
            cy.nodes()
                .on("dbltap", e => {
                    const variable = e.target.data();
                    if (variable.v !== ZERO) {
                        params.manual = setManualValue(params, variable);
                        document.getElementById("explanation-probe").style.display = "flex";
                        document.getElementById("var-input-desc").innerHTML = `Propagate a value for "${variable.og}"!`
                        cy.resize();
                    }
                });
            
            cy.fit();
            return cy;
        }

        function setManualValue(params, variable) {
            params.manual = {
                variable: variable.v,
                value: 0,
                id: variable.id
            }

            return params.manual;
        }

        const ruleName = getRuleName(data.ops[data.current].name);
        utils.addTitle(ruleName);

        const header = document.getElementById('ruleName');
        document.getElementById('question')?.remove();

        const question = document.createElement('a'); 
        question.setAttribute("id", "question");
        question.setAttribute("class", "bar-button");
        question.setAttribute("data-position", "top");
        question.innerHTML = `<i class="material-icons" style="font-size: 23px;margin:5px">help_outline</i>`;
            
        question.setAttribute("data-tooltip", 
            `By expressing the premises and conclusion (or its negation) <br> 
            as a graph of inequalities, a negative cycle shows how variables <br> 
            become equal to more than one value, which is a contradiction. <br>
            Double-click on a variable node to see how a value becomes negative.`
        );
        
        header.appendChild(question);
        M.Tooltip.init(question);

        const operationHeight = getHeight(data);
        params.wide = true;
        const { input, output } = createVisContainer(params, where, operationHeight);
        //d3.select('#cd-divider').style('height', operationHeight);
        const showObvious = this.showObvious;
        const types = this.types;

        const dispatchHighlightCustomEvent = throttle((eid, target) => {
            document.dispatchEvent(new CustomEvent("ineq-graph-hl", { detail: { eid, cy, target }, }))
        }, 50);

        const dispatchUndoHighlightCustomEvent = throttle(eid => {
            document.dispatchEvent(new CustomEvent("undo-ineq-graph-hl", { detail: { cy }, }))
        }, 50);
        
        controls({ data, }, where, params)

        cy = drawGraph(data.ops[data.current]);
        animateNegativeCycle(cy);

        document.removeEventListener('undo-ineq-graph-hl', undoGraphHighlight)
        document.addEventListener('undo-ineq-graph-hl', undoGraphHighlight)
        document.removeEventListener('ineq-graph-hl', ineqGraphHighlight)
        document.addEventListener('ineq-graph-hl', ineqGraphHighlight)

        function playWithVar(_) {
            params.manual.value = +varInput.value;
            cy.nodes().forEach(d => {
                d.data({v: d.data().og})
            })
            animateNegativeCycle(cy, { nid: params.manual.id })
        }
        const varInput = document.getElementById('var-input')
        varInput.value = "";
        varInput.addEventListener('change', playWithVar)
        document.getElementById('play-with-var').addEventListener('click', playWithVar)

        utils.showMeasure(params.subProof.name);
    }
}