import { proof } from "../proof.js";


function getNegs(id, data) {
    const nid = `~${id}`;
    if (!data.getElementById(nid)) {
        const n1id = nid+"-1";
        const n2id = nid+"-2";

        if (data.getElementById(n1id) && data.getElementById(n2id)) {
            return [n1id, n2id];
        } else {
            return [];
        }
    }
    return [nid];
}

function getConstraint(id, data) {

    const q = data.getElementById(id); 
    const type = q.nodeName; // equation, inequation or bottom

    if (type === "contradiction") {
        return { id, "bottom" : "⊥" };
    }

    function extractTerm(term) {
        const coe = term.getAttribute("coe");

        if (coe === null) { // constant
            let con = term.getAttribute("con");
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

    const constraint = {};
    const ass = q.getAttribute("asserted");
    constraint._asserted = ass === "true";
    
    if (type === "inequation") {
        constraint.lhs = {};
        constraint.rhs = {};

        let constants = 0;
        const terms = q.querySelectorAll("lhs > term, rhs > term");
        terms.forEach(t => {
            const term = extractTerm(t);
            if (term.type === "constant") {
                constraint[t.parentNode.nodeName].constant = term.value;
                constants++;
            } else {
                constraint[t.parentNode.nodeName][term.name] = term.coe;
            }
            constraint.type = q.getAttribute("type");
        });
        if (constants > 1) {
            console.error("more than 1 constant");
        }

    } else if (type === "equation")  { // equations only have variables on lhs and a constant on rhs
        const lhs = q.querySelectorAll("lhs > term");
        lhs.forEach((t) => {
            const term = extractTerm(t);
            constraint[term.name] = term.coe;
        });

        const rhs = q.querySelector("rhs > term").getAttribute("con");
        constraint._rhs = rhs;
    } else {
        console.error("faulty constraintID");
        return;
    }

    return constraint;
}

function buildCDRule({ d, data }) {
    let domain = '';
    const CDName = data.querySelector('concreteDomainMap').getAttribute("CDName");

    if (CDName === 'LinearConstraints') {
        domain = 'linear'
    }
    
    if (CDName === 'DifferenceConstraints') {
        domain = 'diff'
    }

    const op = {
        id: d.id,
        domain,
        premises: [],
        conclusion: undefined
    }

    const ms = [].map.call(d.querySelectorAll("ref"), m => {
        const id = m.getAttribute("constraintID");
        return {
            id, 
            t: m.getAttribute("type"),
            coe: m.getAttribute("coe"),
            constraint: getConstraint(id, data),
            negs: getNegs(id, data).map(n => getConstraint(n, data))
        }
    });

    op.premises = ms.filter(m => m.t === "premise");
    op.conclusion = ms.filter(m => m.t === "conclusion")[0]
    
    return { op };
}

function getNodes(data, edges) {
    const allNodes = {}
    // Compute nodes
    data.querySelectorAll("node").forEach((d) => {

        const node = { id: d.id };
        const dataNodes = d.childNodes; // querySelectorAll(`[*|id='${d.id}']>data`);

        const sp = d.getAttribute && d.getAttribute("subProofID");
        node.subProof = sp;

        dataNodes.forEach((item) => {
            
            const key = item.getAttribute && item.getAttribute("key");
            const children = item.childNodes;

            if (key) {
                if (children.length === 1) {
                    node[key] = item.textContent;
                } else {
                    node[key] = {};
                    children.forEach(c => {
                        const ckey = c.getAttribute && c.getAttribute("key");
                        if (ckey) {
                            node[key][ckey] = c.textContent;
                        }
                    });
                }
            }
        });

        if (node.type === "CDRule") {
            node.data = buildCDRule({ d, data });
        }

        const outgoingEdges = edges.filter((edge) => edge.source === d.id);
        node.isRoot = outgoingEdges.length === 0;

        allNodes[node.id] = node;
    });

    return allNodes;
}

function addNodesToEdges(nodes, edges) {
    // add the node data to the edge data
    edges.forEach((d) => {
        d.source = nodes[d.source];
        d.target = nodes[d.target];
    });

    return { nodes, edges };
}

function getTreeFromXML(data) {
    // read edges 
    let edges = [].map.call(data.querySelectorAll("edge"), (d) => {
        let edgeId = d.getAttribute("id");
        let edgeSource = d.getAttribute("source");
        let edgeTarget = d.getAttribute("target");

        return { id: edgeId, source: edgeSource, target: edgeTarget };
    });

    // read nodes
    let nodes = getNodes(data, edges);

    return addNodesToEdges(nodes, edges);
}

function getTreeFromJSON(data) { // { edges, nodes }
    let edges = data.edges; // { id, source, target }
    let nodes = data.nodes.map(d => {
        const outgoingEdges = edges.filter((edge) => edge.source === d.id);
        d.isRoot = outgoingEdges.length === 0;
        return d;
    }); // { id, type, element, labels:{}, data (eg numerical)} 
    
    return addNodesToEdges(nodes, edges);
}

function computeTreeLayout(hierarchy) {

    function separation(a, b) {
        return ((a.width + b.width) / 2) / proof.nodeVisuals.maxNodeWidth + 0.03;
    }

    let tree_layout;

    if (proof.allowOverlap) {
        // tries to fit to screen 
        tree_layout = d3.tree()
            .size([proof.width, proof.height])
            .separation((a, b) => separation(a, b))
            (hierarchy);
    } else {
        tree_layout = d3.tree()
            .nodeSize([
                proof.nodeVisuals.maxNodeWidth, 
                proof.nodeVisuals.maxNodeHeight * (proof.isCompact ? 2 : 2.5)
            ])
            .separation((a, b) => separation(a, b))
            (hierarchy);
        
        tree_layout.each(d => {
            d.x += proof.width / 2; // center proof in view
        });
    }
    
    if (proof.isLinear) {
        return proof.linear.computeLinearLayout(tree_layout);
    }
    
    return tree_layout;
}

export { getTreeFromXML, getTreeFromJSON, computeTreeLayout }