import { text, controls, createVisContainer } from "./cd-rules.js";
import { utils } from "../rules.js";
import { parallelCoords } from "../../../parallel-coords/parallel-coords-svg.js";

export class LinearCD {
    
    showObvious = false;

    draw(data, name, params, where) {
        function getVariables(data) {
            const set = new Set(data.map(d => [
                ...(d.op.premises.map(p => Object.keys(p.constraint))).flat(1),
                ...Object.keys(d.op.conclusion.constraint)
            ]).flat(1));

            set.delete("_rhs");
            return Array.from(set);
        }

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

        function highlightText(d) {
            const allEqs = d3.selectAll(".text-eq")
            allEqs.classed("hl-text", false)

            Array.from(d.detail.ids).forEach(id => {
                d3.select(`#eq-${id}`).classed("hl-text", true)
            })
        }

        function makePCP(data) {
            d3.select("#pcp").selectAll("*").remove();
            const dim = d3.select("#explanation-container").node().getBoundingClientRect()

            pcp = parallelCoords(
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

        const exp = createVisContainer(params, where);
        const variables = getVariables(data);
        const header = [...variables, "_rhs"]; // ensures _rhs is at the end
        const pcp_data = {};
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
        const text_data = text(data);
        controls({
            prevFn: (e, d) => {
                current = Math.max(0, current - 1);
                pcp.update(pcp_data[current]);
                displayRowOperation(text_data[current]);
            },
            currentFn: () => { },
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
        }, where, params);
        displayRowOperation(text_data[current]);
        makePCP(pcp_data[current]);
        document.removeEventListener('pcp-hl', highlightText)
        document.addEventListener('pcp-hl', highlightText)
    }
}