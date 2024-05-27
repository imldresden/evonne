import { controls, createVisContainer } from "./cd-rules.js";
import { utils } from "../rules.js";
import { parallelCoords } from "../../../parallel-coords/parallel-coords-svg.js";

export class LinearCD {

    showObvious = false;

    draw(data, params, where) {
        function getVariables(data) {
            const set = new Set(Object.values(data.ops).map(d => {
                const premises = (d.premises.map(p => Object.keys(p.constraint))).flat(1);
                if (!d.conclusion.constraint.bottom) {
                    return [...premises, ...Object.keys(d.conclusion.constraint)];
                }
                return [...premises];
            }).flat(1));

            set.delete("_rhs");
            set.delete("_asserted");
            return Array.from(set);
        }

        function getPolyline(eq, id, color) {
            variables.forEach(v => {
                if (!eq[v]) {
                    eq[v] = "0";
                }
            });

            const polyline = { id, color, nuid: "" };
            const sheader = new Set(header);
            Object.keys(eq)
                .sort((a, b) => a.localeCompare(b))
                .forEach(k => {
                    if (sheader.has(k)) {
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
                    }
                });

            return polyline;
        }

        function displayRowOperation(op) {
            exp.selectAll("*").remove();

            let length = 0;
            function printEquation(eq, where) {

                if (eq.bottom) {
                    where.append("span").attr("class", "tab");
                    where.append("span").attr("id", `eq-${eq.bottom.id}`).attr("class", "text-red").text("⊥");
                }

                let first = true;
                // use header instead of (Object.keys(eq) to ensure same order)
                header.forEach(variable => {
                    const term = eq[variable].replace(/\s+/g, '');

                    if (variable === "_rhs") {
                        where.append("span").attr("class", "text-black").text(" = " + term)
                        length += (3 + term.length);
                        return;
                    }

                    if (!showObvious && eval(term) === 0) {
                        return; // don't print, don't set first to false
                    }

                    const plus = first ? "" : " + ";
                    where.append("span").attr("class", "text-black").text(plus)

                    if (!showObvious && eval(term) !== 1) {
                        if (eval(term) === -1) {
                            where.append("span").attr("class", "text-black").text("-");
                            length += 1;
                        } else {
                            where.append("span").attr("class", "text-black").text(term);
                            length += term.length;
                        }
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

            utils.addMidRule([length], exp)
            printEquation(op.conclusion.constraint, exp.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"))
        }

        function highlightText(e) {
            d3.selectAll(".text-eq").classed("hl-text", false);
            d3.selectAll(`#eq-${Array.from(e.detail.ids).join(', #eq-')}`).classed("hl-text", true)
        }

        function makePCP(data) {
            d3.select("#pcp").selectAll("*").remove();
            const dim = d3.select("#explanation-container").node().getBoundingClientRect()

            parallelCoords(
                { id: "pcp", details: "explanation-container", width: dim.width, height: dim.height },
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

        utils.addTitle("Numerical Logic: Gaussian Elimination");

        const { input } = createVisContainer(params, where);
        d3.select('#cd-divider').style('height', 0);
        const exp = input;
        const variables = getVariables(data);
        const header = [...variables, "_rhs"]; // ensures _rhs is at the end
        const pcp_data = {};
        const style = getComputedStyle(document.querySelector('body'));
        const colors = [
            style.getPropertyValue('--color-blue'),
            style.getPropertyValue('--color-lime'),
            style.getPropertyValue('--color-purple-dark'),
        ];

        Object.values(data.ops).forEach((op, i) => {
            pcp_data[i] = [];

            op.premises.forEach(premise => {
                const pr = getPolyline(premise.constraint, premise.id, colors[0]);
                pcp_data[i].push(pr);
            });

            if (!op.conclusion.constraint.bottom) {
                const conclusion = getPolyline(op.conclusion.constraint, op.conclusion.id, colors[2]);
                pcp_data[i].push(conclusion);
            }

            if (pcp_data[i].length !== 3) {
                delete pcp_data[i];
                console.error("linear inferences should only have 2 premises leading to 1 conclusion");
            }
        });

        Object.keys(pcp_data).forEach(i => {
            Object.keys(pcp_data[i][0]).forEach(k => {
                if (pcp_data[i][0][k].hasOwnProperty("value")) {
                    pcp_data[i][0][k].dest = pcp_data[i][2][k].value; // 1st premise will become conclusion
                }
            });
        });

        const domains = {};

        header.forEach(v => {
            if (!domains[v]) {
                domains[v] = d3.extent(
                    Object.values(pcp_data)
                        .reduce((a, b) => a.concat(b), [])
                        .map(d => d[v].value)
                );
            }
        });

        const showObvious = this.showObvious; 
        if (data.ops[data.current] && pcp_data[data.current]) {
            controls({ data, }, where, params);
            displayRowOperation(data.ops[data.current]);
            makePCP(pcp_data[data.current]);
            document.removeEventListener('pcp-hl', highlightText)
            document.addEventListener('pcp-hl', highlightText)
        }
    }
}