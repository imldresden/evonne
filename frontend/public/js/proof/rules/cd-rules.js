import { utils } from "./rules.js";
import { parallelCoords } from "../../parallel-coords/parallel-coords-svg.js";

export class CDRules {

    rules = {
        "[Propagate =]": (data) => { this.diff(data, "propagating..") },
        "[Constant too small]": (data) => { this.diff(data, "smalling..") },
        "[Sum of differences]": (data) => { this.diff(data, "summing..") },
        "[Introduce >]": (data) => { this.diff(data, "introducing..") },
        "[Constant difference]": (data) => { this.diff(data, "diffing..") },
    }

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
        const ops = Object.values(data.ops);
        const text_data = {};

        ops.forEach((op, i) => {
            text_data[i] = {
                premises: {},
                conclusion: {}
            };

            op.premises.forEach(premise => {
                text_data[i].premises[premise.eq] = {
                    coe: premise.coe,
                    eq: data.constraints[premise.eq]
                };
            });

            text_data[i].conclusion = { eq: data.constraints[op.conclusion] };
        });

        return text_data;
    }

    controls({ prevFn, currentFn, nextFn }) {
        const prev = this.tooltip
            .append("button")
            .attr("class", "btn btn-primary");

        prev.on("click", prevFn);

        prev.append("i")
            .attr("class", "material-icons")
            .text("keyboard_arrow_left");

        const next = this.tooltip
            .append("button")
            .attr("class", "btn btn-primary");

        next.on("click", nextFn);

        next.append("i")
            .attr("class", "material-icons")
            .text("keyboard_arrow_right");

        this.tooltip.append("br");
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

        const header = [...data.variables, "_rhs"];
        const pcp_data = {};

        function getPolyline(data, id, color) {
            const augmentedEq = data.constraints[id];
            [...data.variables].forEach(v => {
                if (!augmentedEq[v]) {
                    augmentedEq[v] = "0";
                }
            });

            const polyline = { id, color, nuid: "" };
            Object.keys(augmentedEq)
                .sort((a, b) => a.localeCompare(b))
                .forEach(k => {
                    polyline[k] = {
                        value: eval(augmentedEq[k]),
                        type: 'numbers'
                    }
                    polyline.nuid +=
                        augmentedEq[k]
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

        const ops = Object.values(data.ops);
        const finalC = getPolyline(data, ops[ops.length - 1].conclusion, colors[2]);

        ops.forEach((op, i) => {
            pcp_data[i] = [];

            op.premises.forEach(premise => {
                const pr = getPolyline(data, premise.eq, colors[0]);
                pcp_data[i].push(pr);
            });

            const conclusion = getPolyline(data, op.conclusion, colors[1]);

            if (conclusion.nuid !== finalC.nuid) {
                pcp_data[i].push(conclusion);
            }

            pcp_data[i].push(finalC);
        });

        const domains = {};

        header.forEach(v => {
            if (!domains[v]) {
                domains[v] = d3.extent(Object.values(pcp_data).reduce((a, b) => a.concat(b), []).map(d => d[v].value));
            }
        });

        let pcp;
        let current = 0;

        function displayRowOperation(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printEquation(eq, where) {
                // use header instead of (Object.keys(eq) to ensure same order)
                header.forEach((h, i) => {
                    if (h === "_rhs") {
                        const term = eq._rhs.replace(/\s+/g, '');
                        where.append("span").attr("class", "text-black").text(" = " + term)
                        length += (3 + term.length);
                    } else if (i === 0) {
                        const term = eq[h].replace(/\s+/g, '')
                        where
                            .insert("span", ":first-child").attr("class", "text-black").text(term)
                            .append("span").attr("class", "text-green").text(h);
                        length += (term.length + h.length);
                    } else {
                        const term = eq[h].replace(/\s+/g, '')
                        where
                            .append("span").attr("class", "text-black").text(" + " + term)
                            .append("span").attr("class", "text-green").text(h);
                        length += (term.length + h.length);
                    }
                });
            }

            Object.values(op.premises).forEach((pr, i) => {
                if (i !== 0) {
                    exp.append("span").attr("class", "text-red").text(" + ");
                    length += 3
                }
                exp.append("span").attr("class", "text-red").text(pr.coe + " * (");
                printEquation(pr.eq, exp.append("span").attr("id", "eq-" + pr.eq.id))
                exp.append("span").attr("class", "text-red").text(")");
                length += (5 + pr.coe.toString().length);
            });

            exp.append("hr").attr("class", "mid").attr("width", (length * 13))
            printEquation(op.conclusion.eq, exp.append("span").attr("id", "eq-" + op.conclusion.eq.id))
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
            }
        });

        displayRowOperation(text_data[current]);
        pcp = parallelCoords(
            { id: "pcp", details: "pcp-container", width: 700, height: 300 },
            pcp_data[current],
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

    diff(data, name) {
        //Add a title for the explanation view
        utils.addTitle("Numerical Logic: " + name);

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

        const ops = Object.values(data.ops);

        let current = 0;

        function displayRowOperation(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printInequation(ineq, where) {
                console.log(ineq)
                Object.keys(ineq.lhs).forEach((h, i) => {
                    const term = ineq.lhs[h];
                    if (h === "constant") {
                        where.append("span").attr("class", "text-black").text((i === 0 ? "" : " + ") + term)
                        length += (term.length);
                    } else {
                        where
                            .append("span").attr("class", "text-black").text((i === 0 ? "" : " + ") + term)
                            .append("span").attr("class", "text-green").text(h);
                        length += (term.length + h.length);
                    }
                });
                
                where.append("span").attr("class", "text-black").text(" " + ineq.type + " ")
                Object.keys(ineq.rhs).forEach((h, i) => {
                    let term = ineq.rhs[h];
                    if (h === "constant") {
                        where.append("span").attr("class", "text-black").text((i === 0 ? "" : " + ") + term)
                        length += (term.length);
                    } else {
                        where
                            .append("span").attr("class", "text-black").text((i === 0 ? "" : " + ") + term)
                            .append("span").attr("class", "text-green").text(h);
                        length += (term.length + h.length);
                    }
                });
            }

            Object.values(op.premises).forEach((pr, i) => {
                if (i !== 0) {
                    exp.append("span").attr("class", "text-red").text(" + ");
                    length += 3
                }
                exp.append("span").attr("class", "text-red").text("[" + pr.coe + "] ");
                printInequation(pr.eq, exp.append("span").attr("id", "eq-" + pr.eq.id))
                length += (5 + pr.coe.toString().length);
            });

            exp.append("hr").attr("class", "mid").attr("width", (length * 13))
            printInequation(op.conclusion.eq, exp.append("span").attr("id", "eq-" + op.conclusion.eq.id))
        }

        const text_data = this.text(data);
        this.controls({})
        displayRowOperation(text_data[current]);
    }
}
