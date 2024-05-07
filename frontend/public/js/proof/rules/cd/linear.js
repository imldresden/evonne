import { controls, createVisContainer } from "./cd-rules.js";
import { utils } from "../rules.js";
import { parallelCoords } from "../../../parallel-coords/parallel-coords-svg.js";

export class LinearCD {
    
    showObvious = false;

    draw(data, params, where) {
        function getVariables(data) {
            const set = new Set(Object.values(data.ops).map(d => [
                ...(d.premises.map(p => Object.keys(p.constraint))).flat(1),
                ...Object.keys(d.conclusion.constraint)
            ]).flat(1));

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
            Object.keys(eq)
                .sort((a, b) => a.localeCompare(b))
                .forEach(k => {
                    if (k !== "_asserted") {
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

        const { input } = createVisContainer(params, where);
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

            const conclusion = getPolyline(op.conclusion.constraint, op.conclusion.id, colors[2]);

            pcp_data[i].push(conclusion);
            /* // To distinguish between the final conclusion of the subproof, 
            // also change the color of `conclusion` to e.g., colors[1]
            const keys = Object.keys(data.ops);
            const finalC = getPolyline(
                data.ops[keys.length - 1].conclusion.constraint,
                data.ops[keys.length - 1].conclusion.id,
                colors[2]
            );

            if (conclusion.nuid !== finalC.nuid) {
                pcp_data[i].push(conclusion);
            }

            pcp_data[i].push(finalC);*/

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
        const showObvious = this.showObvious;
        
        controls({
            data, 
            plotFn: (data) => {
                pcp.destroy();
                makePCP(pcp_data[data.current]);
                displayRowOperation(data.ops[data.current]);
            }
        }, where, params);
        displayRowOperation(data.ops[data.current]);
        makePCP(pcp_data[data.current]);
        document.removeEventListener('pcp-hl', highlightText)
        document.addEventListener('pcp-hl', highlightText)
    }
}