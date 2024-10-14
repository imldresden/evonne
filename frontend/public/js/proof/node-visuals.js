import { globals } from "../shared-data.js";
import { proof } from "./proof.js";
import { utils as ruleUtils } from "./rules/rules.js"

export const nodeVisualsDefaults = {
    BOX_WIDTH: 170,
    TRAY_HEIGHT: 25,
    BOTTOM_TRAY_WIDTH: 40,
    TOP_TRAY_WIDTH: 60,
    BOX_PADDING: 5,
    BOX_PADDING_BOTTOM: 10,
    SHORT_LABEL_LENGTH: 16,
    CONNECTOR_SIZE: 10,
    BTN_EXTEND_WIDTH: 20,
    BTN_EXTEND_HEIGHT: 20,
    BTN_CIRCLE_SIZE: 15,
    BTN_TRIANGLE_SIZE: 20,
    TEXT_PAD: 8,
    AXIOM_TEXT_BOTTOM_SHIFT: 30,
    EXPANSION_COLLAPSING_DURATION: 200,
}

export class NodeVisualsHelper {

    constructor() {
        this._nodes = undefined;
        this._svg = undefined;
    }

    set nodes(nodes) {
        this._nodes = nodes;
    }

    get nodes() {
        return this._nodes;
    }

    set svg(svg) {
        this._svg = svg;
    }

    get svg() {
        return this._svg;
    }

    nodesCurrentDisplayFormat = new Map()
    nodesDisplayFormat = new Map()
    maxNodeWidth = 20;
    nodeLineHeight = 20;
    maxNodeHeight = 20;
    totalHeight = 0;

    renderNodes(where, what) {
        proof.nodeVisuals.svg = where;
        proof.nodeVisuals.nodes = what;

        this.resetConnectors();

        if (proof.isLinear) {
            if (!proof.isCompact) {
                this.renderConnectorsByType("Right", "Left");
            }
        } else {
            this.renderConnectorsByType("Up");
            this.renderConnectorsByType("Down");
        }

        // Draw the restOfProof node
        const r = this.nodes.select(".rest").on("click", () => proof.tree.restoreFromSubProof());
        const circle = r.append("circle").attr("r", 10)
        const text = r.append("text").text(proof.tree.cuts.length);
        
        if (proof.isCompact) {
            circle.attr("cy", 10).attr("cx", -15);
            text.attr("y", 14).attr("x", -19);
        } else {
            circle.attr("cy", 15).attr("cx", 0);
            text.attr("y", 19).attr("x", -4);
        }

        this.renderBoxes(); 
        this.renderLabels(); 
        this.addShowHideMouseEvents(); //handle hover effect on axiom nodes
    }

    resetConnectors() {
        this.nodes.selectAll(".node").each(function () {
            const s = d3.select(this);
            s.selectAll("circle").remove();
            s.selectAll("rect").remove();
        });
    }

    renderConnectorsByType(direction, alternate) {
        const { CONNECTOR_SIZE } = nodeVisualsDefaults;
        const directions = {
            "Up": {
                cx: 0,
                cy: 0,
                x: - CONNECTOR_SIZE / 2,
                y: - CONNECTOR_SIZE / 2,
            },

            "Down": {
                cx: 0,
                cy: (d) => d.height,
                x: - CONNECTOR_SIZE / 2,
                y: (d) => d.height - CONNECTOR_SIZE / 2
            },

            "Right": {
                cx: (d) => d.width / 2,
                cy: (d) => d.height / 2,
                x: (d) => d.width / 2 - CONNECTOR_SIZE / 2,
                y: (d) => d.height / 2 - CONNECTOR_SIZE / 2
            },

            "Left": {
                cx: (d) => - d.width / 2,
                cy: (d) => d.height / 2,
                x: (d) => - d.width / 2 - CONNECTOR_SIZE / 2,
                y: (d) => d.height / 2 - CONNECTOR_SIZE / 2
            },
        };

        const circleAttributes = {
            cx: directions[direction].cx,
            cy: directions[direction].cy,
            r: CONNECTOR_SIZE / 2,
        };
        const rectangleAttributes = {
            x: alternate ? directions[alternate].x : directions[direction].x,
            y: alternate ? directions[alternate].y : directions[direction].y,
            height: CONNECTOR_SIZE,
            width: CONNECTOR_SIZE,
        };

        let newClasses = undefined;
        let directionClass = "connector" + direction;
        let commonClasses = ["connector", directionClass];
        let selection = undefined;
        let connector = undefined;
        let connectorType = undefined;
        let attributes = undefined;
        
        
        this.nodes.selectAll(".node:not(.rest)").each(function (node) {
            selection = d3.select(this);

            //Skip conclusion for bottom connectors
            if (selection.classed("conclusion") && direction === "Down") {
                return;
            }

            if (!node.children && direction === "Up") {
                return;
            }

            //Continue with adding the connectors
            newClasses = [...commonClasses];
            if (selection.classed("axiom")) {
                connectorType = "circle";
                attributes = circleAttributes;
                if (selection.classed("conclusion")) {
                    newClasses.push("conclusionConnector");
                } else if (selection.classed("asserted")) {
                    newClasses.push("assertedAxiomConnector");
                } else {
                    newClasses.push("inferredAxiomConnector");
                }
            } else {
                connectorType = "rect";
                attributes = rectangleAttributes;
                if (selection.classed("rule")) {
                    newClasses.push("ruleConnector");
                } else if (selection.classed("krule")) {
                    newClasses.push("kRuleConnector");
                } else {
                    newClasses.push("mRuleConnector");
                }
            }
            connector = selection.append(connectorType);
            connector.attr("class", newClasses.join(" "));
            Object.keys(attributes).forEach(k => {
                selection.select("." + directionClass).attr(k, attributes[k]);
            });
        });
    }

    renderBoxes() {
        const { BOTTOM_TRAY_WIDTH, TOP_TRAY_WIDTH, TRAY_HEIGHT } = nodeVisualsDefaults;
        let elements = this._nodes.selectAll(".node:not(.rest)");

        elements.filter(":not(.conclusion)").on("click", (e, d) => e.ctrlKey && proof.compactInteraction && proof.tree.showSubTree(d))
        //Remove old rectangles
        elements.selectAll(".bg-box").remove();
        //Add a rectangle for the tray of communication buttons
        elements.filter(":not(.rule)").append("rect")
            .attr("id", "backRect")
            .attr("class", "bg-box tray")
            .attr("x", -BOTTOM_TRAY_WIDTH / 2)
            .attr("y", 0)
            .attr("width", BOTTOM_TRAY_WIDTH)
            .attr("height", TRAY_HEIGHT)
            .style("opacity", 0);

        //Add a rectangle for the tray of axiom display buttons
        elements.filter(":not(.rule)").append("rect")
            .attr("id", "topRect")
            .attr("class", "bg-box tray")
            .attr("x", -TOP_TRAY_WIDTH / 2)
            .attr("y", 0)
            .attr("width", TOP_TRAY_WIDTH)
            .attr("height", TRAY_HEIGHT)
            .style("opacity", 0);

        elements.filter(".rule")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        //Add a rectangle for the label
        elements.append("rect")
            .attr("id", "frontRect")
            .attr("class", `bg-box ${proof.isCompact ?  "": "rounded-box" }` )
            .attr("x", d=> -(d.width) / 2)
            .attr("y", 0)
            .attr("width", d => d.width)
            .attr("height", d => d.height)
            .classed("expanded", false);
    }

    renderLabels() {
        const { TEXT_PAD } = nodeVisualsDefaults;

        //get all nodes
        let elements = [];
        let elementsClass = [];
        let elementsID = [];

        elements.push(this.nodes.selectAll(".axiom"));
        elementsClass.push("axiomLabel");
        elementsID.push("axiomText");

        elements.push(this.nodes.selectAll(".node:not(.axiom, .rest)"));
        elementsClass.push("ruleLabel");
        elementsID.push("ruleText");

        for (let i = 0; i < elements.length; i++) {
            //remove labels text
            elements[i].selectAll("text").remove();
            //add new ones
            /*elements[i].append("foreignObject")
                .attr("x", d => -(d.width) / 2 + TEXT_PAD)
                .attr("y", 0)
                .attr("width", d=> d.width)
                .attr("height", d=> d.height)
                .append("xhtml:div")
                .style("font-size", "10px")
                .html((d, i, nodes) => {
                    
                    return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu enim quam. "
                });*/

            elements[i].append("text")
                .attr("id", elementsID[i])
                .attr("class", elementsClass[i])
                .attr("x", d => -(d.width) / 2 + TEXT_PAD)
                .attr("y", d => d.height / 1.5)
                .text((d, i, nodes) => {
                    const display = proof.nodeVisuals.nodesCurrentDisplayFormat.get(nodes[i].parentNode.id);

                    let label = this.getLabel(d.data.source, display)
                    if (display && display === "shortened") {
                        label = globals.labelsShorteningHelper.shortenLabel(label, proof.isRuleShort, globals.shorteningMethod);
                    }

                    return label;
                }); /**/
        }
    }

    //These functions are for showing / hiding the buttons associated with axiom nodes
    hideButtons(nodeID) {
        let buttons = d3.selectAll(`#${nodeID} .axiomButton:not(#B01,#B02,#B06,#B04,#B05)`);
        buttons.transition()
            .duration(150)
            .ease(d3.easeLinear)
            .style("opacity", 0)

        //This requires a link button of id = detachButton + nodeID(N+num)
        let detachButton = d3.select("#detachButton" + nodeID);
        detachButton.transition()
            .duration(150)
            .ease(d3.easeLinear)
            .style("opacity", 0)
        //.transition().delay(150).style("display", "none");
    }

    showButtons(nodeID) {
        let buttons = d3.selectAll(`#${nodeID} .axiomButton`);
        buttons
            .transition()
            .duration(150)
            .ease(d3.easeLinear)
            .style("opacity", 1);

        //This requires a link button of id = detachButton + nodeID(N+num)
        let detachButton = d3.select("#detachButton" + nodeID);
        detachButton
            //.style("display", "block")
            .transition()
            //.delay(200)
            .duration(150)
            .ease(d3.easeLinear)
            .style("opacity", 1);
    }

    initHideAllButtons() {

        if (!proof.isCompact) {
            proof.svg.selectAll(".node")
            .selectAll(".axiomButton")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all")
            .style("opacity", 0);
        }
        
    }

    // Mouse Events function     
    activeNodes = {};
    addShowHideMouseEvents() {
        proof.svg.selectAll(".axiom")
            .on("dblclick", (e, d) => {
                if (!proof.isDrawing && (proof.trays.upper || proof.trays.lower)) {
                    this.expandCollapseNode(e.currentTarget.id, d);
                }
            });

        proof.svg.selectAll(".node:not(.rest)")
            .on("mouseenter", (e, d) => {
                this.activeNodes[d.id] && clearTimeout(this.activeNodes[d.id]);
                this.shiftLabelShowButtons(e.currentTarget);
            })
            .on("mouseleave", (e, d) => {
                const node = e.currentTarget;
                const inactive = d3.selectAll(`#${node.id} .axiomButton.active`).empty();
                if (inactive) {
                    if (!proof.isCompact) {
                        this.activeNodes[d.id] = setTimeout(() => {
                            this.shiftLabelHideButtons(node);
                            try {
                                const nd = d3.select("#" + node.id)
                                if (nd && nd.classed("expanded")) {
                                    this.collapseNode(nd, d);
                                }
                            } catch (_) { } // tray becomes undefined despite the check due to timeout
                        }, 1500);
                    }
                }
            })
            .on("contextmenu", (e, d) => {
                const menuItems = proof.axioms.menuItems;
                e.preventDefault();
                globals.contextMenu.create(e, d, menuItems.filter(m => m.filter && m.filter(d)), "#proof-view");
            })
    }

    //These functions are for expanding and collapsing rectangles of axiom nodes
    expandCollapseNode(nodeID, d) {
        let node = d3.select("#" + nodeID);
        let expanded = node.classed("expanded");

        if (expanded) {
            this.collapseNode(node, d);
        } else {
            this.expandNode(node, d);
        }
    }

    expandNode(node, d) {
        const { EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;
        proof.svg.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .on("start", () => { })
            .on("end", () => {
                this.addShowHideMouseEvents();
                this.showCommunicationButtons(node);
            });


        this.moveButtons(node, "expand");
        this.updateEdge(node, d);
    }

    collapseNode(node, d) {
        const { EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;
        let t = proof.svg.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .on("start", () => { this.hideCommunicationButtons(node); })
            .on("end", () => { this.addShowHideMouseEvents(); });

        //Collapse the trays
        node.classed("expanded", false)
            .selectAll(".tray") 
            .transition(t)
            .attr("y", 0)
            .style("opacity", 0);

        //Move right bottom buttons to new position
        this.moveButtons(node, "collapse", t);
        this.updateEdge(node, d);
    }

    shiftLabel(node, direction) {
        let element = d3.select(node).select(".axiomLabel");
        if (direction === "right") {
            //.5em = 8px which is the val in the css class
            element.transition().attr("transform", "translate(8,0)")
        } else if (direction === "left") {
            element.transition().attr("transform", "translate(0,0)")
        }
    }

    shiftLabelShowButtons(node) {
        if (proof.nodeVisuals.nodesDisplayFormat.get(node.id) !== "original") {
            this.shiftLabel(node, "right");
        }
        this.showButtons(node.id);
    }

    shiftLabelHideButtons(node) {
        if (proof.nodeVisuals.nodesDisplayFormat.get(node.id) !== "original") {
            this.shiftLabel(node, "left");
        }
        this.hideButtons(node.id);
    }

    showCommunicationButtons(node) {
        if (proof.trays.lower) {
            node.selectAll("#B01,#B02").style("display", "block");
        }
        if (proof.trays.upper) {
            node.selectAll("#B06,#B04,#B05").style("display", "block");
        }
    }

    hideCommunicationButtons(node) {
        if (proof.trays.lower) {
            node.selectAll("#B01,#B02").style("display", "none");
        }
        if (proof.trays.upper) {
            node.selectAll("#B06,#B04,#B05").style("display", "none");
        }
    }

    moveButtons(node, action, t) {
        if (proof.trays.lower) {
            this.moveLowerTray(node, action, t);
        }
        if (proof.trays.upper) {
            this.moveUpperTray(node, action, t);
        }
    }

    moveLowerTray(node, action, t) {
        const { TRAY_HEIGHT, EXPANSION_COLLAPSING_DURATION, CONNECTOR_SIZE } = nodeVisualsDefaults;

        let bottomNodeConnector = node.select(".connectorDown");
        let bottomConnectorTranslate = "translate(0, 0)"; // collapse

        if (action === "expand") {
            //Expand the back rectangle
            node.classed("expanded", true)
                .selectAll("#backRect")
                .style("opacity", 1)
                .transition(t)
                .attr("y", d => d.height - 5)
            bottomConnectorTranslate = `translate(0, ${TRAY_HEIGHT / 2 + CONNECTOR_SIZE / 2 + 2})`;
        }

        //move the down connector to the new position
        bottomNodeConnector.transition()
            .duration(EXPANSION_COLLAPSING_DURATION)
            .ease(d3.easeLinear)
            .attr("transform", bottomConnectorTranslate);

    }

    moveUpperTray(node, action, t) {
        const { TRAY_HEIGHT, EXPANSION_COLLAPSING_DURATION, CONNECTOR_SIZE } = nodeVisualsDefaults;

        let topNodeConnector = node.select(".connectorUp");
        let topConnectorTranslate = "translate(0, 0)"; // collapse

        if (action === "expand") {
            //Expand the top tray
            node.classed("expanded", true)
                .selectAll("#topRect")
                .style("opacity", 1)
                .transition(t)
                .attr("y", -TRAY_HEIGHT + 5)
            topConnectorTranslate = `translate(0, ${-TRAY_HEIGHT + 5})`;
        }

        // move upper connector
        topNodeConnector.transition()
            .duration(EXPANSION_COLLAPSING_DURATION)
            .ease(d3.easeLinear)
            .attr("y", -TRAY_HEIGHT + 5 - CONNECTOR_SIZE)
            .attr("transform", topConnectorTranslate);
    }

    updateEdge(node, d) {
        if (proof.trays.lower) {
            this.moveLowerConnector(node, d);
        }
        if (proof.trays.upper) {
            this.moveUpperConnector(node, d);
        }
    }

    moveLowerConnector(node, d) {
        const { TRAY_HEIGHT, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;
        const id = `L${d.data.target.id}*${d.data.source.id}`;
        const line = d3.select(`[id="${id}"]`);

        //For the final conclusion, no edge update is needed
        if (line.empty()) {
            return;
        }

        const oldY = parseFloat(line.attr("y1"));
        let newY = oldY - (TRAY_HEIGHT - 5);
        if (node.classed("expanded")) {
            newY = oldY + (TRAY_HEIGHT - 5);
        }

        line.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .attr("y1", newY);
    }

    moveUpperConnector(node, d) {
        const { TRAY_HEIGHT, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;

        if (!d.children) {
            return;
        }

        //For the line connecting to the top connector
        const id = `L${d.data.source.id}*${d.children[0].data.source.id}`;
        const line = d3.select(`[id="${id}"]`);

        const oldY = parseFloat(line.attr("y2"));
        let newY = oldY + (TRAY_HEIGHT - 5);

        if (node.classed("expanded")) {
            newY = oldY - (TRAY_HEIGHT - 5);
        }

        line.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .attr("y2", newY);
    }

    getNodeDims(node) {
        // estimation of the size of each character
        const display = proof.nodeVisuals.nodesCurrentDisplayFormat.get(`N${node.data.source.id}`);
        
        let label = this.getLabel(node.data.source, display);
        
        if (display && display === "shortened") {
            label = globals.labelsShorteningHelper.shortenLabel(label, proof.isRuleShort, globals.shorteningMethod);
        }

        const lines = label.split('\n');
        node.width = Math.max(lines.map(l => l.length)) * globals.fontCharacterWidth;
        node.height = lines.length * this.nodeLineHeight;

        if (!proof.isCompact) {
            node.width += nodeVisualsDefaults.TEXT_PAD * 2;
            node.height += nodeVisualsDefaults.TEXT_PAD;
        } else {
            node.width += nodeVisualsDefaults.TEXT_PAD;
        }
        
        return node;
    }

    setNodeDimsAndMax(node) {
        // computes all widths, saves them per node and sets max
        if (node !== null) {
            this.getNodeDims(node);
            this.totalHeight += node.height + (proof.isCompact ? 5 : 15);
            if (node.width > this.maxNodeWidth) {
                this.maxNodeWidth = node.width;   
            }

            if (node.height > this.maxNodeHeight) {
                this.maxNodeHeight = node.height;
            }

            if (node.children) {
                node.children.forEach(a => this.setNodeDimsAndMax(a));
            }
        } else {
            console.error('received null node');
        }
    }

    getNodeClass(d) {
        let classStr = "node " + d.data.source.type;
        if (ruleUtils.isRule(d.data.source.type)) {
            classStr += " rule";
        }
        classStr = !d.parent && d.data.source.type !== "rest" ? classStr + " conclusion" : classStr;
        return classStr;
    }

     
    changeOpacities(iDsToHighlight) {
        let dataS, dataT;

        proof.svg.selectAll("g.node,line.link,path.link").style("opacity", (d) => {
            if (d.source) {
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

    setFullOpacityToAll() {
        proof.svg.selectAll("g.node,line.link,path.link").style("opacity", 1);
    }

    getLabel(node, display = "original") {   
        if (node.labels) {
            if (display === "textual") {
                return node.labels.naturalLanguage;
            }
            return node.labels.default;
        }
        return node.element;
    }
}