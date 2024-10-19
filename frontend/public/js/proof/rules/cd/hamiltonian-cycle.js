function hamiltonianCycle(options, _eles) {
    let { weight, directed, root } = options;
    let weightFn = weight;
    let eles = _eles;
    let cy = _eles.cy();
    let edges = _eles.filter(e => e.group() === "edges");
    let nodes = _eles.filter(e => e.group() === "nodes");

    root = cy.collection(root)[0]; // in case selector passed

    let numNodes = nodes.length;

    const path = new Array(numNodes).fill(0);
    for (var i = 0; i < numNodes; i++) {
        path[i] = -1;
    }

    let weightSum = 0;
    const invertedEdgeMap = {};
    edges.forEach(e => {
        const d = e.data();
        if (!invertedEdgeMap[d.source]) {
            invertedEdgeMap[d.source] = {};
        } 

        invertedEdgeMap[d.source][d.target] = e;
    });

    function getEdge(src, target) {
        if (invertedEdgeMap[src] && invertedEdgeMap[src][target]) {
            return invertedEdgeMap[src][target];
        }
    }

    /* true if the vertex v can be added at 'pos' */
    function canAdd(v, path, pos) {
        const e = getEdge(path[pos - 1], v);
        
        if (!e) { 
            return { can: false };
        }

        /* false if vertex has already been included */
        for (const p of path) {
            if (p === v) { 
                return { can: false };
            }
        }

        return { can: true, w: weightFn(e) };
    }

    function hamCycleUtil(path, pos) {
        // all nodes have been added
        if (pos == numNodes) {
            
            // and an edge exists from last pos to root
            const e = getEdge(path[pos - 1], path[0]);

            if (e) { 
                weightSum += weightFn(e);
                return true;
            } else {
                return false;
            } 
        }

        // try vertices except root as next candidate in Hamiltonian Cycle
        const checkable = nodes
            .map(n => n.data().id)
            .filter(n => n !== path[0]);
        
        for (const v of checkable) {
            const check = canAdd(v, path, pos);
            if (check.can) {
                path[pos] = v;
                weightSum += check.w;

                // recur to construct rest of the path 
                if (hamCycleUtil(path, pos + 1)) {     
                    return true;
                } 
                
                path[pos] = -1;
                weightSum -= check.w;
            }
        }
        
        return false;
    }

    path[0] = root.data().id;

    if (hamCycleUtil(path, 1) == false) {
        console.error("could not detect hamiltonian cycle") 
        return { cycle: [], weight: undefined }
    } 

    const cycle = [];
    path.forEach((_, i) => {
        if (i > 0) {
            cycle.push(getEdge(path[i-1], path[i]));
        }
    })
    cycle.push(getEdge(path[numNodes-1], path[0]))

    return { cycle, weight: weightSum };
}

export { hamiltonianCycle }