import { utils } from "./rules.js";
import { parallelCoords } from "../../parallel-coords/parallel-coords-svg.js";

export class CDRules {

    rules = {
        "[Propagate =]" : (p, c) => { console.log("propagating..") },
        "[Constant too small]": (p, c) => { console.log("smalling..") },
        "[Sum of differences]": (p, c) => { console.log("summing..") },
        "[Introduce >]": (p, c) => { console.log("introducing..") },
        "[Constant difference]": (p, c) => { console.log("diffing..") },
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

    linear(data) {
        //Add a title for the explanation view
        utils.addTitle("Numerical Logic");

        //Add visualization
        this.tooltip.append("div")
            .style("width", "700px")
            .style("height", "300px")
            .append("div")
            .attr("class", "pcp-container")
            .attr("id", "pcp-container")
        
        const header = [...data.vars, "rhs"]; 
        const pcp_data = {};

        function getPolyline(data, id, color) {
            const augmentedEq = data.eqs[id];
            [...data.vars].forEach(v => {
                if (!augmentedEq[v]) {
                    augmentedEq[v] = "0"; 
                }
            });

            const polyline = { id, color, nuid: "" };
            Object.keys(augmentedEq)
                .sort((a, b) => a.localeCompare(b))
                .forEach(k => {
                    polyline[k] = { value: eval(augmentedEq[k]), type: 'numbers' }
                    polyline.nuid += 
                        augmentedEq[k]
                        .replaceAll(" ","")
                        .replaceAll("-","min")
                        .replaceAll("/","div")+k;
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
        const finalC = getPolyline(data, ops[ops.length-1].conclusion, colors[2]);

        ops.forEach( (op, i) => {
            pcp_data[i] = [];

            const conclusion = getPolyline(data, op.conclusion, colors[1]); 
            op.premises.forEach(premise => {
                const pr = getPolyline(data, premise.eq, colors[0]);
                pcp_data[i].push(pr);
            });
            
            if (conclusion.nuid !== finalC.nuid) {
                pcp_data[i].push(conclusion);
            }
            pcp_data[i].push(finalC);
        });

        const domains = {};
        
        header.forEach(v => {
            if (!domains[v]) {
                domains[v] = d3.extent(Object.values(pcp_data).reduce((a, b)=> a.concat(b), []).map(d=> d[v].value)); 
            }
        });
        
        let pcp;
        let current = 0;

        const prev = this.tooltip
            .append("button")
            .attr("class", "btn btn-primary");
        
        prev.on("click", (e, d) => {
            current = Math.max(0, current -1);
            pcp.update(pcp_data[current]);
        });
        
        prev.append("i")
            .attr("class", "material-icons")
            .text("keyboard_arrow_left");
        
        const next = this.tooltip
            .append("button")
            .attr("class", "btn btn-primary");

        next.on("click", (e, d) => {
            current = Math.min(current + 1, Object.keys(pcp_data).length-1);
            pcp.update(pcp_data[current]);
        });

        next.append("i")
            .attr("class", "material-icons")
            .text("keyboard_arrow_right");

        this.tooltip.append("br");
        this.tooltip.append("br");

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
}
