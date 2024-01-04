import { proof } from "../proof.js";

function extractConstraints(node) {
    const variables = new Set();
    const constraints = {};

    node.querySelectorAll("equation, inequation").forEach((c) => {

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
                    variables.add(term.name);
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
                variables.add(term.name);
            });

            const rhs = c.querySelector("rhs > term").getAttribute("coe");
            constraint._rhs = rhs;
        }

        constraints[c.getAttribute("id")] = constraint;
    });
    return { constraints, variables };
}

function extractNumbers(raw) {
    // extracts a sequence of operations and their respective constraints (equations/inequations) from cdProofNodes
    const result = {};
    const numericals = raw.querySelectorAll("cdProofNode");

    numericals.forEach((node) => {

        const { constraints, variables } = extractConstraints(node);
        const ops = {};
        const rowOperations = node.querySelectorAll("cdRule");
        rowOperations.forEach((operation) => {
            const op = {
                premises: [],
                conclusion: operation.querySelector("conclusion").getAttribute("equation")
            };

            const premises = operation.querySelectorAll("premise");
            premises.forEach((premise) => {
                op.premises.push({
                    coe: premise.getAttribute("coefficient"),
                    eq: premise.getAttribute("equation")
                });
            });

            ops[operation.getAttribute("id")] = op;
        });

        result[node.getAttribute("linkedToNode")] = { variables, ops, constraints };
    });

    return result;
}

function buildCDRule({ data, edgeData }, { d, node }) {
    const ms = d.querySelectorAll("multiplication")

    if (ms.length > 0) {
        const ops = {};
        ops[node.id] = {
            premises: [].map.call(ms, m => {
                return {
                    coe: m.getAttribute("coefficient"),
                    eq: m.getAttribute("nodeID")
                }
            }),
            conclusion: edgeData.filter((edge) => edge.source === node.id)[0].target
        }


        // TODO: distinguish between linear and diff in a better way
        const type = data
            .getElementById(ops[node.id].conclusion) // check if conclusion is equation or inequation
            .querySelectorAll("equation").length === 0 ? "diff" : "linear";

        const constraints = {};
        const _ce = extractConstraints(data.getElementById(ops[node.id].conclusion));
        const variables = _ce.variables;
        constraints[ops[node.id].conclusion] = _ce.constraints[Object.keys(_ce.constraints)[0]];

        // TODO: not a single equation per node 
        if (Object.keys(_ce.constraints).length > 0) {
            //console.log(_ce.constraints)
        }

        ops[node.id].premises.forEach(p => {
            const _e = extractConstraints(data.getElementById(p.eq));

            // TODO: not a single equation per node 
            if (Object.keys(_e.constraints).length > 0) {
                //console.log(p.eq)
                //console.log(_e)
            }

            constraints[p.eq] = _e.constraints[Object.keys(_e.constraints)[0]];
        });

        node.data = { ops, constraints, variables, type }

    }
    return node;
}

function getNodes(data, edgeData) {
    let extras = extractNumbers(data);

    // Compute nodes
    return [].map.call(data.querySelectorAll("node"), (d) => {

        let node = { id: d.id };
        const dataNodes = d.querySelectorAll("data");

        dataNodes.forEach((item) => {
            const key = item.getAttribute("key");

            if (key) {
                node[key] = item.textContent;
            } else {
                // for nodes with number logic
                const entries = item.querySelectorAll("entry");
                node.data = {};
                entries.forEach(e => {
                    const { constraints, variables } = extractConstraints(e);
                    const cons = Object.values(constraints);
                    if (cons.length !== 1) {
                        console.error("malformed entry");
                    }

                    node.data[e.querySelector("key").textContent] = { constraints: cons[0], variables };
                });
            }
        });

        if (node["type"] === "CDRule") {
            node = buildCDRule({ data, edgeData }, { d, node });
        }

        const outGoingEdges = edgeData.filter((edge) => edge.source === d.id);
        node.isRoot = outGoingEdges.length === 0;

        let rule = edgeData.filter((edge) => edge.target === d.id)[0];
        rule = rule ? rule.rule : rule;

        if (Object.keys(extras).length === 0) {
            if (proof.isLinear) {
                node.data = { rule };
            }
        } else {
            node.data = proof.isLinear ? extras[rule] : extras[node.element];
        }

        return node;
    });
}

function processData(data) {
    if (proof.isLinear) {
        return processDataLinear(data);
    } 
    
    // Compute edges
    let edgeData = [].map.call(data.querySelectorAll("edge"), (d) => {
        let edgeId = d.getAttribute("id");
        let edgeSource = d.getAttribute("source");
        let edgeTarget = d.getAttribute("target");

        return { id: edgeId, source: edgeSource, target: edgeTarget };
    });

    let nodeData = getNodes(data, edgeData);

    // Add the nodeData to the edgeData
    edgeData.forEach((d) => {
        d.source = nodeData.find((b) => b.id === d.source);
        d.target = nodeData.find((b) => b.id === d.target);
    });

    return {
        nodes: nodeData,
        edges: edgeData,
    };
}

function processDataLinear(data) {
    // Compute edges
    let edgeData = [];
    [].map.call(data.querySelectorAll("hyperedge"), d => {
        let edgeIDSuffix = 97;
        let edgeTarget;
        let rule = {};
        d.querySelectorAll("data").forEach(k => {
            rule[k.getAttribute("key")] = k.textContent;
        });
        d.querySelectorAll("endpoint").forEach(e => {
            if (e.getAttribute("type") === "in") {
                edgeTarget = e.getAttribute("node");
            }
        });
        let endPoints = d.querySelectorAll("endpoint");
        if (endPoints.length === 1) {
            endPoints.forEach(e => {
                let edgeId = d.getAttribute("id");
                let edgeSource = null;
                edgeIDSuffix++;
                edgeData.push({ id: edgeId, source: edgeSource, target: edgeTarget, rule });
            });
        } else {
            endPoints.forEach(e => {
                if (e.getAttribute("type") === "out") {
                    let edgeId = d.getAttribute("id") + String.fromCharCode(edgeIDSuffix);
                    let edgeSource = e.getAttribute("node");
                    edgeIDSuffix++;
                    edgeData.push({ id: edgeId, source: edgeSource, target: edgeTarget, rule });
                }
            });
        }
    });

    let nodeData = getNodes(data, edgeData);

    //remove edges with a null source
    edgeData = edgeData.filter(d => !!d.source)

    // Add the nodeData to the edgeData
    edgeData.forEach(d => {
        d.source = nodeData.find(b => b.id === d.source);
        d.target = nodeData.find(b => b.id === d.target);
    });

    return {
        nodes: nodeData,
        edges: edgeData
    };
}

function computeTreeLayout(hierarchy) {

    if (proof.isLinear) {
        return proof.linear.computeLinearLayout(hierarchy);
    }

    function separation(a, b) {
        return ((a.width + b.width) / 2) / proof.nodeVisuals.maxNodeWidth + 0.03;
    }

    // Layout and draw the tree
    hierarchy.dx = 50;
    hierarchy.dy = proof.proofWidth / (hierarchy.height + 1);
    let tree_layout;

    if (proof.allowOverlap) {
        // tries to fit to screen 
        tree_layout = d3.tree()
            .size([proof.proofWidth, proof.proofHeight])
            .separation((a, b) => separation(a, b))
            (hierarchy);
    } else {

        tree_layout = d3.tree()
            .nodeSize([proof.nodeVisuals.maxNodeWidth, proof.nodeVisuals.maxNodeHeight * 1.2])
            .separation((a, b) => separation(a, b))
            (hierarchy);
    }

    return tree_layout;
}

export { processData, computeTreeLayout }