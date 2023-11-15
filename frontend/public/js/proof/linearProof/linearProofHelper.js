import { APP_GLOBALS as app, SharedData } from "../../shared-data.js";
import {nodeVisualsDefaults} from "../nodeVisualsHelper.js";

export{processData, computeLinearLayout, drawCurvedLinks, renderSideConnectorsByType,
    addHighlightCurrentInferenceEvent, highlightCurrentInference, setFullOpacityToAll};

function getDFOrder(hierarchy, orderedElements){
    hierarchy.children?.forEach(d=>{
        getDFOrder(d,orderedElements);
    });
    orderedElements.push(hierarchy);
}

function getNodesAtLevel(nodePreviousLevel){
    let result = [];
    nodePreviousLevel.forEach(e=>{
        e.children?.forEach(d=>{
            result.push(d);
        });
    });
    return result;
}

function getBFOrder(hierarchy, orderedElements){
    let nodesAtLevel = getNodesAtLevel(hierarchy);
    if(nodesAtLevel.length !== 0)
        getBFOrder(nodesAtLevel,orderedElements);
    nodesAtLevel.forEach(d=>{
        orderedElements.push(d);
    });
}

function computeLinearLayout(hierarchy) {
    // Layout and draw the tree
    hierarchy.dx = 50;
    hierarchy.dy = app.proofWidth / (hierarchy.height + 1);

    let linearLayout = d3.tree().size([app.proofWidth, app.proofHeight])
        .separation((a,b) => (a.width + b.width) / 2)(hierarchy);

    let orderedElements = [];
    if (!app.isDistancePriority)
        getDFOrder(linearLayout, orderedElements);
    else {
        getBFOrder([linearLayout],orderedElements);
        orderedElements.push(linearLayout);
    }

    let itemY = app.proofHeight/(orderedElements.length<2?1:orderedElements.length-1);
    linearLayout.each(d => {
        d.x = 0.7 * app.proofWidth - d.width/2;
        if (orderedElements.length<2)
            d.y = 0.01*app.proofHeight;
        else
            d.y = 1.01*app.proofHeight - ((orderedElements.indexOf(d))*itemY);
    });

    return linearLayout;
}

function processData(data) {
    // Compute edges
    let edgeData = [];
    [].map.call(data.querySelectorAll("hyperedge"), d => {
        let edgeIDSuffix = 97;
        let edgeTarget;
        let ruleName = d.querySelector("data").textContent;
        d.querySelectorAll("endpoint").forEach(e => {
            if(e.getAttribute("type") === "in") {
                edgeTarget = e.getAttribute("node");
            }
        });
        let endPoints = d.querySelectorAll("endpoint");
        if (endPoints.length === 1) {
            endPoints.forEach(e => {
                let edgeId = d.getAttribute("id");
                let edgeSource = null;
                edgeIDSuffix++;
                edgeData.push({id: edgeId, source: edgeSource, target: edgeTarget, ruleName: ruleName});
            });
        } else {
            endPoints.forEach(e => {
                if (e.getAttribute("type") === "out") {
                    let edgeId = d.getAttribute("id") + String.fromCharCode(edgeIDSuffix);
                    let edgeSource = e.getAttribute("node");
                    edgeIDSuffix++;
                    edgeData.push({id: edgeId, source: edgeSource, target: edgeTarget, ruleName: ruleName});
                }
            });
        }
    });

    // Compute nodes
    let nodeData = [].map.call(data.querySelectorAll("node"), d => {
        let dataNodes, typeVar, elementVar, msElementVar, nlElementVar, idVar;

        idVar = d.getAttribute("id");

        dataNodes = d.querySelectorAll("data");

        dataNodes.forEach(function (item) {
            const key = item.getAttribute("key");
            if (key === "type") {
                typeVar = item.textContent;
            } else if (key === "element") {
                elementVar = item.textContent;
            } else if (key === "mselement") {
                msElementVar = item.textContent;
            } else if (key === "nlelement") {
                nlElementVar = item.textContent;
            }
        });
        let outGoingEdges = edgeData.filter(function (edge) {
            return edge.source === idVar
        });
        let isRoot = false;
        if (outGoingEdges.length===0) {
            isRoot = true;
        }

        let ruleName = edgeData.filter(function (edge) {
            return edge.target === idVar
        })[0].ruleName

        return {
            id: idVar, type: typeVar, element: elementVar, mselement: msElementVar, nlelement: nlElementVar,
            isRoot: isRoot, ruleName:ruleName
        };
    });

    //remove edges with a null source
    edgeData = edgeData.filter(d=>!!d.source)

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

function drawCurvedLinks(t){
    SharedData.links.selectAll("path").remove()

    SharedData.links.selectAll("path")
        .data(SharedData.root.links(), d=>"L" + d.source.data.source.id + "*" + d.target.data.source.id)
        .join(
            enter=>enter.append("path")
                .attr("marker-end", "url(#arrowhead)")
                .attr("class", d=> d.source.data.source.type === "rest"? "link torest":"link")
                .attr("id",d=>"L" + d.source.data.source.id + "*" + d.target.data.source.id)
                .attr('d',d=>position(d,true))
                .call(enter =>
                    enter.transition(t)
                        .attr('d',d=>position(d))
                ),
            exit => exit.remove(),
        );
}

function position(d, zero){
    //Note: "-0.01" was added to make the drawing works properly for the arrow of the highest node
    let x2,y2,x1,y1, targetX,targetY,sourceX,sourceY;
    if (zero) {
        targetX = d.target.x0;
        targetY = d.target.y0;
        sourceX = d.source.x0;
        sourceY = d.source.y0-0.01;
    } else {
        targetX = d.target.x;
        targetY = d.target.y;
        sourceX = d.source.x;
        sourceY = d.source.y-0.01;
    }
    x2 = targetX + .5 * d.target.width;
    y2 = app.proofHeight - targetY + nodeVisualsDefaults.BOX_HEIGHT/2;
    x1 = sourceX+ .5 * d.source.width;
    y1 = app.proofHeight - sourceY + nodeVisualsDefaults.BOX_HEIGHT/2;

    let offset = Math.abs(y2-y1)/2;

    let midpoint_x = (x1 + x2) / 2;
    let midpoint_y = (y1 + y2) / 2;

    let dx = (x1 - x2);
    let dy = (y1 - y2);

    let normalise = Math.sqrt((dx * dx) + (dy * dy));

    let offSetX = midpoint_x + offset*(dy/normalise);
    let offSetY = midpoint_y - offset*(dx/normalise);

    return "M" + x2 + "," + y2 +
        "S" + offSetX + "," + offSetY +
        " " + x1 + "," + y1;
}

function renderSideConnectorsByType() {
    let newClasses = undefined;
    let selection = undefined;
    let connector = undefined;
    let connectorType = undefined;

    //get axioms nodes
    let elements = SharedData.nodes.selectAll(".node");
    //remove old connectors
    elements.selectAll(".connector").remove();
    //add new connectors
    elements.each(function(){
        selection = d3.select(this);
        //Skip first rules for top connectors
        // let hasChildren;
        // selection.each(d=>hasChildren = !!d.children || !!d._children);
        let inferredUsing;
        selection.each(d=>inferredUsing = d.data.source.ruleName);
        // if(!hasChildren)
        if (inferredUsing === "Asserted Conclusion")
            selection.attr("class", "node axiom asserted");
        newClasses = ["connector"]
        if(selection.classed("conclusion"))
            newClasses.push("conclusionConnector");
        else if(selection.classed("asserted"))
            newClasses.push("assertedAxiomConnector");
        else
            newClasses.push("inferredAxiomConnector");
        connector = selection.append("circle");
        connector.attr("class", newClasses.join(" "));
        selection.select(".connector")
            .attr("cx",(d) => d.width/2)
            .attr("cy",nodeVisualsDefaults.BOX_HEIGHT/2)
            .attr("r",nodeVisualsDefaults.CONNECTOR_SIZE/2)
    });

    // Draw the rest-of-proof node
    SharedData.nodes.select(".rest").append("circle").attr("r", 10)
        .on("click",()=>{SharedData.resetHierarchy();});
}

function highlightCurrentInference(currentNode){

    let iDsToHighlight = [currentNode.data.source.id];
    if (currentNode.children) {
        currentNode.children.forEach(x=>{
            iDsToHighlight.push(x.data.source.id);
        });
    }
    let dataS,dataT;
    
    d3.select("#proof-view").selectAll("g.node,path.link").style("opacity", (d)=>{
        if (d.source){
            dataS = d.source.data;
            dataT = d.target.data;
        } else {
            dataS = dataT = d.data;
        }
            
        if (iDsToHighlight.includes(dataS.source.id) && iDsToHighlight.includes(dataT.source.id)) {
            return 1;
        }
        return .2;
    });
}

function setFullOpacityToAll(){
    d3.select("#proof-view").selectAll("g.node,path.link").style("opacity",1);
}

function addHighlightCurrentInferenceEvent(){
    d3.selectAll(".node")
        .on("mouseover", (d) => { highlightCurrentInference(d); })
        .on("mouseout", () => { setFullOpacityToAll(); });
}