import { addNodesToEdges } from "./process-data.js";

function getProofFromJSONTrace(data) { // { edges, nodes }
    // takes nemo trace and returns data in format for evonne's stratify function
    console.log(data.payload)

    let edges = []; // data.edges; // { id, source, target }
    let nodes = []; 
    
    recursiveTreeParse(data.payload, nodes, edges, { first: true });
    return addNodesToEdges(nodes, edges);
}

function recursiveTreeParse(source, nodes, edges, { parent = undefined, first= false } = {}) {
    const predicate = { id: nodes.length, type: "axiom", element: source.predicate, data:{} }
    
    if (first) {
        predicate.isRoot = first; 
        predicate.data.query = source;
        first = false;
    }

    nodes.push(predicate);

    if (parent) {
        edges.push({ id: `e-${edges.length}`, source: predicate.id, target: parent.id });
    }

    if (source.childInformation) {
        parent = { id: nodes.length, type: "rule", element: ''+source.childInformation.rule, data:{}}
    } else {
        parent = { id: nodes.length, type: "rule", element: 'fact', data:{}}
    }

    nodes.push(parent)
    edges.push({ id: `e-${edges.length}`, source: parent.id, target: predicate.id}); // 

    if (source.childInformation && source.childInformation.children) {
        source.childInformation.children.forEach(c => {
            recursiveTreeParse(c, nodes, edges, { parent, first });
        })
    }
}

export { getProofFromJSONTrace }