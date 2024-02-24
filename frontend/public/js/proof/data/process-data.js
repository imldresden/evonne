import { proof } from "../proof.js";

function getConstraint(id, data) {
    const node = data.getElementById(id);
    const q = node.querySelectorAll("equation, inequation"); 

    if (q.length > 1) {
        console.error("multiple constraints in a single entry")
    }

    const c = node.querySelectorAll("equation, inequation")[0]
    if (!c) {
        if (node.querySelector("key").innerHTML === "⊥") {
            return { id, "bottom" : "⊥" }
        } else {
            console.error("faulty constraintID")
            return;
        }
    }

    function extractTerm(term) {
        const coe = term.getAttribute("coe");

        if (coe === null) { // constant
            const con = term.getAttribute("con");
            if (con === null) {
                console.error("malformed term");
            }

            return { type: "constant", value: con }
        } else { // variable
            let name = term.getAttribute("var");
            if (name.indexOf('#') !== -1) {
                name = name.slice(name.indexOf('#') + 1, name.indexOf('>'));
            }

            return { type: "variable", name, coe }
        }
    }

    const type = c.nodeName; // equation or inequation
    const constraint = {};

    if (type === "inequation") {
        constraint.lhs = {};
        constraint.rhs = {};

        let constants = 0;
        const terms = c.querySelectorAll("lhs > term, rhs > term");
        terms.forEach((t) => {
            const term = extractTerm(t);

            if (term.type === "constant") {
                constraint[t.parentNode.nodeName].constant = term.value;
                constants++;
            } else {
                constraint[t.parentNode.nodeName][term.name] = term.coe;
            }
            constraint.type = c.getAttribute("type");
        });
        if (constants > 1) {
            console.error("more than 1 constant")
        }

    } else { // equations only have variables on lhs and a constant on rhs
        const lhs = c.querySelectorAll("lhs > term");
        lhs.forEach((t) => {
            const term = extractTerm(t);
            constraint[term.name] = term.coe;
        });

        const rhs = c.querySelector("rhs > term").getAttribute("con");
        constraint._rhs = rhs;
    }

    return constraint;
}

function buildCDRule({ d, data }) {
    const op = {
        id: d.id,
        premises: [],
        conclusion: undefined
    }

    const ms = [].map.call(d.querySelectorAll("ref"), m => {
        const id = m.getAttribute("constraintID");
        return {
            id, 
            t: m.getAttribute("type"),
            coe: m.getAttribute("coe"),
            constraint: getConstraint(id, data)
        }
    });

    op.premises = ms.filter(m => m.t === "premise");
    op.conclusion = ms.filter(m => m.t === "conclusion")[0]

    // TODO: distinguish between linear and diff in a better way
    const type = op.premises[0].coe === null ? "diff" : "linear";
    
    return { op, type };
}

function getNodes(data, edgeData) {

    // Compute nodes
    return [].map.call(data.querySelectorAll("node"), (d) => {

        const node = { id: d.id };
        const dataNodes = d.querySelectorAll("data");

        dataNodes.forEach((item) => {
            const key = item.getAttribute("key");

            if (key) {
                node[key] = item.textContent;
            }
        });

        if (node["type"] === "CDRule") {
            node.data = [buildCDRule({ d, data })];
        }

        const outGoingEdges = edgeData.filter((edge) => edge.source === d.id);
        node.isRoot = outGoingEdges.length === 0;

        return node;
    });
}

function processData(data) {
    // read edges 
    let edgeData = [].map.call(data.querySelectorAll("edge"), (d) => {
        let edgeId = d.getAttribute("id");
        let edgeSource = d.getAttribute("source");
        let edgeTarget = d.getAttribute("target");

        return { id: edgeId, source: edgeSource, target: edgeTarget };
    });

    // read nodes
    let nodeData = getNodes(data, edgeData);

    // add the nodeData to the edgeData
    edgeData.forEach((d) => {
        d.source = nodeData.find((b) => b.id === d.source);
        d.target = nodeData.find((b) => b.id === d.target);
    });

    return {
        nodes: nodeData,
        edges: edgeData,
    };
}

function computeTreeLayout(hierarchy) {

    function separation(a, b) {
        return ((a.width + b.width) / 2) / proof.nodeVisuals.maxNodeWidth + 0.03;
    }

    // Layout and draw the tree
    hierarchy.dx = 50;
    hierarchy.dy = proof.width / (hierarchy.height + 1);
    let tree_layout;

    if (proof.allowOverlap) {
        // tries to fit to screen 
        tree_layout = d3.tree()
            .size([proof.width, proof.height])
            .separation((a, b) => separation(a, b))
            (hierarchy);
    } else {
        tree_layout = d3.tree()
            .nodeSize([proof.nodeVisuals.maxNodeWidth, proof.nodeVisuals.maxNodeHeight * 1.2])
            .separation((a, b) => separation(a, b))
            (hierarchy);
        
        tree_layout.each(d => {
            d.x += proof.width / 2; // center proof in view
        });
    }
    
    if (proof.isLinear) {
        return proof.linear.computeLinearLayout(tree_layout, proof.allowOverlap);
    }
    
    return tree_layout;
}

export { processData, computeTreeLayout }