function negativeWeightHamilton (options, _eles) {
    let { weight, directed, root } = options;
    let eles = _eles;
    let cy = _eles.cy();
    let edges = _eles.filter(e => e.group() === "edges");
    let nodes = _eles.filter(e => e.group() === "nodes");

    let numNodes = nodes.length;
    let weightSum = 0;
    
    const path = new Array(numNodes).fill(0);
    const invertedEdgeMap = {};

    root = cy.collection(root)[0]; // in case selector passed

    // find a hamiltonian cycle through recursion: 
    for (var i = 0; i < numNodes; i++) {
        path[i] = -1;
    }

    edges.forEach(e => {
        const d = e.data();
        if (!invertedEdgeMap[d.source]) {
            invertedEdgeMap[d.source] = {};
        } 

        if (!invertedEdgeMap[d.source][d.target]) {
            invertedEdgeMap[d.source][d.target] = [];
        } 

        invertedEdgeMap[d.source][d.target].push(e); 
    });

    function getEdge(src, target, all = false) {
        if (invertedEdgeMap[src] && invertedEdgeMap[src][target]) {
            if (all) { 
                return invertedEdgeMap[src][target];
            } else {
                return invertedEdgeMap[src][target][0];
            }
        }
    }

    // returns true if the vertex v can be added at 'pos'
    function canAdd(v, path, pos) {
        const e = getEdge(path[pos - 1], v);
        
        if (!e) { 
            return { can: false };
        }

        // reutnr false if vertex already in path
        for (const p of path) {
            if (p === v) { 
                return { can: false };
            }
        }

        return { can: true, w: weight(e) };
    }

    function hamiltonRecursion(path, pos) {
        // all nodes have been added
        if (pos === numNodes) {
            
            // and an edge exists from last pos to root
            const e = getEdge(path[pos - 1], path[0]);

            if (e) { 
                weightSum += weight(e);
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
                if (hamiltonRecursion(path, pos + 1)) {     
                    return true;
                } 
                
                path[pos] = -1;
                weightSum -= check.w;
            }
        }
        
        return false;
    }

    path[0] = root.data().id;

    if (hamiltonRecursion(path, 1) === false) {
        console.error("could not detect hamiltonian cycle") 
    } 

    // hamiltonian cycle found in `path`, check if negative weight
    const cycle = [];
    const multiple = Object.values(invertedEdgeMap).filter(e => Object.keys(e).length === 1).length === 0; 
    
    if (path.length === 2) { // only 2 variables involved, search for negative cycle 
        let w = 0;
        let found = false;
        getEdge(path[0], path[1], true).forEach(fe => {
            if (!found) {
                getEdge(path[1], path[0], true).forEach(be => {
                    if (!found) {
                        w = weight(fe) + weight(be); 
                        if (w < 0) {
                            cycle.push(fe);
                            cycle.push(be);
                            found = true;
                        }
                    }
                })
            }
        });

        if (found) {
            return { cycle, weight: w };
        } // could be that the cycle has weight 0 and epsilons
    }

    if (weightSum === 0 && multiple) {
        console.error("can't decide for cycle");
    }

    if (weightSum > 0 && multiple) { // should only happen if there was not a single <= premise
        let w = 0;
        
        for (let i = path.length - 2; i >= 0; i--) {
            const e = getEdge(path[i + 1], path[i]);
            w += weight(e);
            cycle.push(e);
        }

        const fe = getEdge(path[0], path[path.length - 1]);
        w += weight(fe);
        cycle.push(fe);

        if (w >= 0) {
            console.error("could not detect negative hamiltonian cycle");
        }
        
        return { cycle, weight: w };
    } else { // cycle is already negative, or weight = 0
        path.forEach((_, i) => {
            if (i > 0) {
                cycle.push(getEdge(path[i - 1], path[i]));
            }
        });
        cycle.push(getEdge(path[path.length - 1], path[0]))
        return { cycle, weight: weightSum };
    }
}

export { negativeWeightHamilton }