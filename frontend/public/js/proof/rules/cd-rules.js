import { utils } from "./rules.js";
import { parallelCoords } from "../../parallel-coords/parallel-coords-svg.js";

export class CDRules {

    rules = {
        "[Different constants]": (data) => { this.diff(data, "R/=") },
        "[Different differences]": (data) => { this.diff(data, "R /= +") },
        "[Constant too small]": (data) => { this.diff(data, "R<") },
        "[Sum of differences]": (data) => { this.diff(data, "R+") },
        "[Constant difference]": (data) => { this.diff(data, "R-") },
        "[Propagate =]": (data) => { this.diff(data, "R=") },
        "[Tautology]": (data) => { this.diff(data, "R0") },
        "[Invert]": (data) => { this.diff(data, "R<->") },
        "[Propagate >]": (data) => { this.diff(data, "R>") },
        "[Introduce >]": (data) => { this.diff(data, "Introduce >") },
        "[Weaken >]": (data) => { this.diff(data, "Weaken >") },
        "[From ⊥]": (data) => { this.diff(data, "From ⊥") },
    }

    types = {
        "plus": "=",
        "equal": "=",
        "greaterThan": ">",
        "lessThan": "<"
    }

    showObvious = false; 

    draw({ ruleName, tooltip, data }) {
        this.tooltip = tooltip;

        console.log(data)

        if (this.rules[ruleName]) {
            this.rules[ruleName](data);
        } else if (data) {
            this.linear(data);
        } else {
            console.error("unknown cd rule")
        }
    }

    text(data, type) {
        const ops = data.map(d => d.op);
        const text_data = {};

        ops.forEach((op, i) => {
            text_data[i] = op;
        });

        return text_data;
    }

    controls({ prevFn, currentFn, nextFn, replayFn }) {
        const buttons = this.tooltip
            .append("div")
            .attr("class", "controls-bar");

        const prev = buttons.append("a").attr("class", "bar-button");
        prev.append("i")
            .attr("class", "material-icons")
            .text("skip_previous");

        const play = buttons.append("a").attr("class", "bar-button");
        play.append("i")
            .attr("class", "material-icons")
            .text("play_arrow");

        const next = buttons.append("a").attr("class", "bar-button");
        next.append("i")
            .attr("class", "material-icons")
            .text("skip_next");

        const replay = buttons.append("a").attr("class", "bar-button");
        replay.append("i")
            .attr("class", "material-icons")
            .text("replay")
            .style("float", "right")
            .style("padding-right", "50px")
            .style("font-size", "20px");
        
    
        prev.on("click", prevFn);
        play.on("click", currentFn);
        next.on("click", nextFn);
        replay.on("click", replayFn);

        this.tooltip.append("br");
    }

    linear(data) {
        //Add a title for the explanation view
        utils.addTitle("Numerical Logic: Gaussian Elimination");

        const exp = this.tooltip
            .append("div").attr("class", "tooltiptext")
            .attr("id", "rowOperationTextSpan");

        //Add visualization
        this.tooltip.append("div")
            .style("width", "700px")
            .style("height", "300px")
            .append("div")
            .attr("class", "pcp-container")
            .attr("id", "pcp-container")

        function getVariables(data) {
            const set = new Set(data.map(d => [
                ...(d.op.premises.map(p => Object.keys(p.constraint))).flat(1), 
                ...Object.keys(d.op.conclusion.constraint)
            ]).flat(1));

            set.delete("_rhs");
            return Array.from(set);
        }

        const variables = getVariables(data);
        const header = [...variables, "_rhs"]; // ensures _rhs is at the end

        const pcp_data = {};

        function getPolyline(eq, id, color) {
            variables.forEach(v => {
                if (!eq[v]) {
                    eq[v] = "0";
                }
            });

            const polyline = { id, color, nuid: "" };
            Object.keys(eq)
                .sort((a, b) => a.localeCompare(b))
                .forEach(k => {
                    const value = eval(eq[k])
                    polyline[k] = {
                        value: value,
                        dest: value,
                        type: 'numbers'
                    }
                    polyline.nuid += eq[k]
                            .replaceAll(" ", "")
                            .replaceAll("-", "min")
                            .replaceAll("/", "div") + k;
                });

            return polyline;
        }

        const style = getComputedStyle(document.querySelector('body'));
        const colors = [
            style.getPropertyValue('--color-blue'),
            style.getPropertyValue('--color-lime'),
            style.getPropertyValue('--color-purple-dark'),
        ];

        const finalC = getPolyline(
            data[data.length - 1].op.conclusion.constraint,
            data[data.length - 1].op.conclusion.id, 
            colors[2]
        );

        data.forEach((d, i) => {
            const op = d.op;
            pcp_data[i] = [];

            op.premises.forEach(premise => {
                const pr = getPolyline(premise.constraint, premise.id, colors[0]);
                pcp_data[i].push(pr);
            });

            const conclusion = getPolyline(op.conclusion.constraint, op.conclusion.id, colors[1]);

            if (conclusion.nuid !== finalC.nuid) {
                pcp_data[i].push(conclusion);
            }

            pcp_data[i].push(finalC);

            if (pcp_data[i.length !== 3] || pcp_data[i.length !== 4]) {
                console.error("linear inferences should only have 2 premises leading to 1 conclusion + optional final conclusion");
            }
        });

        Object.keys(pcp_data).forEach(i => {
            Object.keys(pcp_data[i][0]).forEach(k => {
                if (pcp_data[i][0][k].hasOwnProperty("value")) {
                    pcp_data[i][0][k].dest = pcp_data[i][2][k].value; // 1st premise will become conclusion
                }
            })
        })
        
        const domains = {};

        header.forEach(v => {
            if (!domains[v]) {
                domains[v] = d3.extent(Object.values(pcp_data).reduce((a, b) => a.concat(b), []).map(d => d[v].value));
            }
        });

        let pcp;
        let current = 0;

        const showObvious = this.showObvious;

        function displayRowOperation(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printEquation(eq, where) {
                let first = true;
                // use header instead of (Object.keys(eq) to ensure same order)
                header.forEach(variable => {
                    const term = eq[variable].replace(/\s+/g, '');

                    if (variable === "_rhs") {
                        where.append("span").attr("class", "text-black").text(" = " + term)
                        length += (3 + term.length);
                        return;
                    }
                    
                    if (!showObvious && eval(term) === 0 ) {
                        return; // don't print, don't set first to false
                    } 
                    
                    const plus = first ? "" : " + ";
                    where.append("span").attr("class", "text-black").text(plus)
                    
                    if (!showObvious && eval(term) !== 1) {
                        where.append("span").attr("class", "text-black").text(term);
                        length += term.length; 
                    }

                    where.append("span").attr("class", "text-green").text(variable);
                    length += (plus.length + variable.length);
            
                    first = false;
                });
            }

            Object.values(op.premises).forEach((pr, i) => {
                if (i !== 0) {
                    exp.append("span").attr("class", "text-red").text(" + ");
                    length += 3
                }
                const oper = pr.coe.replace(/\s+/g, '');
                exp.append("span").attr("class", "text-red").text(oper + " * (");
                printEquation(pr.constraint, exp.append("span").attr("id", "eq-" + pr.id).attr("class", "text-eq premise"))
                exp.append("span").attr("class", "text-red").text(")");
                length += (5 + oper.length);
            });

            exp.append("hr").attr("class", "mid").attr("width", (length * 10))
            printEquation(op.conclusion.constraint, exp.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"))
        }

        const text_data = this.text(data);
        this.controls({
            prevFn: (e, d) => {
                current = Math.max(0, current - 1);
                pcp.update(pcp_data[current]);
                displayRowOperation(text_data[current]);
            },
            currentFn: () => {},
            nextFn: (e, d) => {
                current = Math.min(current + 1, Object.keys(pcp_data).length - 1);
                pcp.update(pcp_data[current]);
                displayRowOperation(text_data[current]);
            },
            replayFn: (e, d) => {
                current = Math.min(current + 1, Object.keys(pcp_data).length - 1);
                pcp.destroy();
                makePCP(pcp_data[current]);
                displayRowOperation(text_data[current]);
            },
        });

        displayRowOperation(text_data[current]);
        makePCP(pcp_data[current]);

        function highlightText(d) {
            const allEqs = d3.selectAll(".text-eq")
            allEqs.classed("hl-text", false)
            
            Array.from(d.detail.ids).forEach(id => {
                d3.select(`#eq-${id}`).classed("hl-text", true)
            })
        }
        
        document.removeEventListener('pcp-hl', highlightText)
        document.addEventListener('pcp-hl', highlightText)

        function makePCP(data) {
            d3.select("#pcp").selectAll("*").remove();
            pcp = parallelCoords(
                { id: "pcp", details: "pcp-container", width: 700, height: 300 },
                data,
                {
                    data_id: 'id',
                    nominals: [],
                    booleans: [],
                    numbers: header,
                    cols: header,
                    domains: domains,
                }
            );
        }
        
    }

    diff(data, name) {
        //Add a title for the explanation view
        utils.addTitle("Difference Logic: " + name);

        const exp = this.tooltip
            .append("div").attr("class", "tooltiptext")
            .attr("id", "rowOperationTextSpan");

        //Add visualization
        this.tooltip.append("div")
            .style("width", "700px")
            .style("height", "300px")
            .append("div")
            .attr("class", "pcp-container")
            .attr("id", "pcp-container")

        let current = 0;

        const showObvious = this.showObvious;
        const types = this.types;

        function displayRule(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printTerms(terms, where) {
                let first = true;
                Object.keys(terms).forEach(variable => {
                    const term = terms[variable];
                    if (!showObvious && eval(term) === 0 && variable !== "constant") {
                        return; // don't print, don't set first to false
                    } 
                    
                    const plus = first ? "" : " + ";
                    where.append("span").attr("class", "text-black").text(plus)
                    length += plus.length;
                    
                    if (!showObvious && (eval(term) !== 1 || variable === "constant")) {
                        where.append("span").attr("class", "text-black").text(term);
                        length += term.length; 
                    }

                    if (variable !== "constant") {
                        where.append("span").attr("class", "text-green").text(variable);
                    }

                    length += variable.length;
                    first = false;
                });
            }

            exp.append("span").attr("class", "text-red").text("[" + name + "] ");

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

            exp.append("hr").attr("class", "mid").attr("width", (length * 10))
            if (op.conclusion.constraint.bottom) {
                exp.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-red").text("⊥")
            } else {
                const constraint = exp.append("span").attr("id", "eq-" + op.conclusion.id)
                printTerms(op.conclusion.constraint.lhs, constraint)
                constraint.append("span").attr("class", "text-black").text(" " + types[op.conclusion.constraint.type] + " ")
                printTerms(op.conclusion.constraint.rhs, constraint)
            }
        }

        const text_data = this.text(data);
        this.controls({})
        displayRule(text_data[current]);
    }
}
