import { controls, createVisContainer } from "../cd-rules.js";
import { utils } from "../../rules.js";

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

        function displayEquationSystem(op) {
            exp.selectAll("*").remove();

            function printEquation(eq, where) {
                let length = 0;

                if (eq.bottom) {
                    where.append("span").attr("class", "tab");
                    where.append("span").attr("id", `eq-${eq.bottom.id}`).attr("class", "text-red").text("⊥");
                }

                let first = true;

                // use header instead of (Object.keys(eq) to ensure same order)
                header.forEach(variable => {
                    if (!eq[variable]) {
                        return; // means it's 0*variable
                    }
                    
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
                
                return length;
            }

            let maxLength = 0;
            Object.values(op.premises).forEach((pr, i) => {
                const l = printEquation(pr.constraint, exp.append("span").attr("id", "eq-" + pr.id).attr("class", "text-eq premise"));
                if (l > maxLength) {
                    maxLength = l;
                }
                exp.append("br");

            });

            utils.addMidRule([maxLength], exp)
            printEquation(op.conclusion.constraint, exp.append("span").attr("id", "eq-" + op.conclusion.id).attr("class", "text-eq conclusion"))
        }

        function highlightText(e) {
            d3.selectAll(".text-eq").classed("hl-text", false);
            d3.selectAll(`#eq-${Array.from(e.detail.ids).join(', #eq-')}`).classed("hl-text", true)
        }

        utils.addTitle("Numerical Logic: Gaussian Elimination");

        const { input } = createVisContainer(params, where);
        d3.select('#cd-divider').style('height', 0);
        const exp = input;
        const variables = getVariables(data);
        const header = [...variables, "_rhs"]; // ensures _rhs is at the end
        const showObvious = this.showObvious; 
        
        if (data.ops[data.current]) {
            controls({ data, }, where, params);
            displayEquationSystem(data.ops[data.current]);
            
            document.removeEventListener('pcp-hl', highlightText)
            document.addEventListener('pcp-hl', highlightText)
        }
    }
}