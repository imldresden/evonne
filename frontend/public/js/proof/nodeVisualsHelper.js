import { APP_GLOBALS as app, SharedData } from "../shared-data.js";
import * as lP from "./linearProof/linearProofHelper.js";

export const nodeVisualsDefaults = {
    BOX_WIDTH: 170,
    BOX_HEIGHT: 30,
    BOX_HEIGHT_Expanded: 25,
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
    BTN_EYE_HORIZONTAL_PADDING: 10,
    BTN_EYE_VERTICAL_PADDING: 10,
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

    renderNodes() {
        if (app.isLinear) {
            lP.renderSideConnectorsByType();
        } else {
            this.renderConnectorsByType("Up");
            this.renderConnectorsByType("Down");
        }
        this.renderBoxes();
        this.renderLabels();
        //handle hover effect on axiom nodes
        this.addShowHideMouseEvents();
    }

    renderConnectorsByType(direction) {
        const { BOX_HEIGHT, CONNECTOR_SIZE } = nodeVisualsDefaults;
        let newClasses = undefined;
        let directionClass = "connector" + direction;
        let commonClasses = ["connector", directionClass];
        let selection = undefined;
        let connector = undefined;
        let connectorType = undefined;
        let attributes = undefined;
        let circleAttributes = {
            cx: ["cx", 0],
            cy: ["cy", direction === "Up" ? 0 : BOX_HEIGHT],
            r: ["r", CONNECTOR_SIZE / 2]
        };
        let rectangleAttributes = {
            x: ["x", - CONNECTOR_SIZE / 2],
            y: ["y", direction === "Up" ? - CONNECTOR_SIZE / 2 : BOX_HEIGHT - CONNECTOR_SIZE / 2],
            height: ["height", CONNECTOR_SIZE],
            width: ["width", CONNECTOR_SIZE]
        };

        //get axioms nodes
        let elements = this.nodes.selectAll(".node");
        //remove old connectors
        elements.selectAll("." + directionClass).remove();
        //add new connectors
        elements.each(function () {
            selection = d3.select(this);
            //Skip conclusion for bottom connectors
            if (selection.classed("conclusion") && direction === "Down")
                return;
            //Skip first rules for top connectors
            let hasChildren;
            selection.each(d => hasChildren = !!d.children || !!d._children);
            if (!hasChildren && direction === "Up")
                return;
            //Continue with adding the connectors
            newClasses = [...commonClasses];
            if (selection.classed("axiom")) {
                connectorType = "circle";
                attributes = circleAttributes;
                if (selection.classed("conclusion"))
                    newClasses.push("conclusionConnector");
                else if (selection.classed("asserted"))
                    newClasses.push("assertedAxiomConnector");
                else
                    newClasses.push("inferredAxiomConnector");
            } else {
                connectorType = "rect";
                attributes = rectangleAttributes;
                if (selection.classed("rule"))
                    newClasses.push("ruleConnector");
                else if (selection.classed("krule"))
                    newClasses.push("kRuleConnector");
                else
                    newClasses.push("mRuleConnector");
            }
            connector = selection.append(connectorType);
            connector.attr("class", newClasses.join(" "));
            Object.values(attributes).forEach(value => {
                selection.select("." + directionClass).attr(value[0], value[1]);
            });
        });

        // Draw the rest-of-proof node
        this.nodes.select(".rest").append("circle").attr("r", 10)
            .on("click", () => { SharedData.resetHierarchy(); });
    }

    renderBoxes() {
        const { BOX_HEIGHT, BOX_WIDTH, BOTTOM_TRAY_WIDTH, TOP_TRAY_WIDTH } = nodeVisualsDefaults;
        let elements = this._nodes.selectAll(".node:not(.rest)");
        //Remove old rectangles
        elements.selectAll(".bg-box").remove();
        //Add a rectangle for the tray of communication buttons
        elements.filter(":not(.rule)").append("rect")
            .attr("id", "backRect")
            .attr("class", "bg-box tray")
            .attr("x", -BOTTOM_TRAY_WIDTH / 2)
            .attr("y", 0)
            .attr("width", BOTTOM_TRAY_WIDTH)
            .attr("height", BOX_HEIGHT)
            .style("opacity", 0)
            .classed("expanded", false);
        //Add a rectangle for the tray of axiom display buttons
        elements.filter(":not(.rule)").append("rect")
            .attr("id", "topRect")
            .attr("class", "bg-box tray")
            .attr("x", -TOP_TRAY_WIDTH / 2)
            .attr("y", 0)
            .attr("width", TOP_TRAY_WIDTH)
            .attr("height", BOX_HEIGHT)
            .style("opacity", 0)
            .classed("expanded", false);
        elements.filter(".rule")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");
        //Add a rectangle for the label
        elements.append("rect")
            .attr("id", "frontRect")
            .attr("class", "bg-box")
            .attr("x", -BOX_WIDTH / 2)
            .attr("y", 0)
            .attr("width", BOX_WIDTH)
            .attr("height", BOX_HEIGHT);
    }

    renderLabels() {
        const { BOX_HEIGHT, BOX_WIDTH, BOX_PADDING, BOX_PADDING_BOTTOM, BTN_EYE_VERTICAL_PADDING } = nodeVisualsDefaults;

        //get all nodes
        let elements = [];
        let elementsClass = [];
        let elementsID = [];

        elements.push(this.nodes.selectAll(".axiom"));
        elementsClass.push("axiomLabel");
        elementsID.push("axiomText");

        elements.push(this.nodes.selectAll(".node:not(.axiom)"));
        elementsClass.push("ruleLabel");
        elementsID.push("ruleText");

        let i;
        for (i = 0; i < elements.length; i++) {
            //remove labels text
            elements[i].selectAll("text").remove();
            //add new ones
            elements[i].append("text")
                .attr("id", elementsID[i])
                .attr("class", elementsClass[i])
                .attr("x", -BOX_WIDTH / 2 + BOX_PADDING)
                .attr("y", BOX_HEIGHT - BOX_PADDING_BOTTOM)
                .text((d, i, nodes) => {
                    d.data.source.element = this.fixTypo(d.data.source.element);
                    let displayFormat = SharedData.nodesCurrentDisplayFormat.get(nodes[i].parentNode.id);
                    if (!displayFormat || displayFormat === "original")
                        return d.data.source.element;
                    if (displayFormat === "shortened")
                        return SharedData.labelsShorteningHelper.shortenLabel(d.data.source.element, app.isRuleShort, app.shorteningMethod);
                    else if (displayFormat === "textual")
                        return d.data.source.nlelement;
                })
                .each((d, i, nodes) => {
                    d3.select(`#${nodes[i].parentNode.id} text`)
                        .attr("x", () => -(nodes[i].getBBox().width) / 2);
                        
                    d3.select(`#${nodes[i].parentNode.id} #frontRect`)
                        .attr("width", () => nodes[i].getBBox().width + 2 * BTN_EYE_VERTICAL_PADDING)
                        .attr("x", () => -(nodes[i].getBBox().width + 2 * BTN_EYE_VERTICAL_PADDING) / 2);
                    d.width = nodes[i].getBBox().width + 2 * BTN_EYE_VERTICAL_PADDING;
                });
        }
    }

    //These functions are for showing / hiding the buttons associated with axiom nodes
    hideButtons(nodeID) {
        let buttons = d3.selectAll(`#${nodeID} .axiomButton:not(#B01,#B02)`);
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

    initVarsAxiomFunctions() {
        SharedData.nodeWithVisibleButtons = { id: "nothing" };
    }

    initHideAllButtons() {
        d3.selectAll(".axiom")
            .filter(() => this.id !== SharedData.nodeWithVisibleButtons.id)
            .selectAll(".axiomButton")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all")
            .style("opacity", 0);
    }

    // Mouse Events function     
    activeNodes = {};
    addShowHideMouseEvents() {
        d3.selectAll(".axiom")
            .on("dblclick", (e, d) => {
                if (!app.isDrawing) {
                    this.expandCollapseNode(e.currentTarget.id);
                    this.updateEdge(d);
                }
            })
            .on("mouseenter", (e, d) => {
                this.activeNodes[d.id] && clearTimeout(this.activeNodes[d.id]);
                this.shiftLabelShowButtons(e.currentTarget);
            })
            .on("mouseleave", (e, d) => {
                const node = e.currentTarget;
                const inactive = d3.selectAll(`#${node.id} .axiomButton.active`).empty();
                if (inactive) {
                    this.activeNodes[d.id] = setTimeout(() => {
                        this.shiftLabelHideButtons(node);
                        if (!app.isDrawing) {
                            const tray = d3.select(`#${node.id} .tray`);
                            if (tray && tray.classed("expanded")) {
                                this.expandCollapseNode(node.id);
                                this.updateEdge(d);
                            }
                        }
                    }, 1500);
                }
            })
            .on("contextmenu", (e, d) => {
                const menuItems = SharedData.axiomFunctionsHelper.menuItems;
                SharedData.contextMenu.create(e, d, menuItems, '#proof-view');
            })
    }

    //These functions are for expanding and collapsing rectangles of axiom nodes
    expandCollapseNode(nodeID) {
        let node = d3.select("#" + nodeID);

        let expanded = node.select(".tray").classed("expanded");
        if (expanded) {
            this.collapseNode(node);
        } else {
            this.expandNode(node);
        }
    }

    expandNode(node) {
        const { EXPANSION_COLLAPSING_DURATION, BOX_HEIGHT_Expanded } = nodeVisualsDefaults;
        app.svgProof.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .on("start", () => {})
            .on("end", () => { 
                this.addShowHideMouseEvents(); 
                this.showCommunicationButtons(node);
        });
        
        this.moveButtons(node, "expand");
    }

    collapseNode(node) {
        const { EXPANSION_COLLAPSING_DURATION, BOX_HEIGHT } = nodeVisualsDefaults;
        let t = app.svgProof.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .on("start", () => { this.hideCommunicationButtons(node); })
            .on("end", () => { this.addShowHideMouseEvents(); });

        //Collapse the trays
        node.selectAll(".tray")
            .classed("expanded", false)
            .transition(t)
            .attr("y", 0)
            .attr("height", BOX_HEIGHT)
            .style("opacity", 0);
        
        //Move right bottom buttons to new position
        this.moveButtons(node, "collapse", t);
    }

    shiftLabel(node, direction) {
        let element = d3.select(node).select(".axiomLabel");
        if (direction === "right") {
            //.5em = 8px which is the val in the css class
            element.transition().attr("transform", "translate(8,0)")
        }
        else if (direction === "left") {
            element.transition().attr("transform", "translate(0,0)")
        }
    }

    shiftLabelShowButtons(node) {
        if (SharedData.nodesDisplayFormat.get(node.id) !== "original") {
            this.shiftLabel(node, "right");
        }
        this.showButtons(node.id);
    }

    shiftLabelHideButtons(node) {
        if (SharedData.nodesDisplayFormat.get(node.id) !== "original") {
            this.shiftLabel(node, "left");
        }   
        this.hideButtons(node.id);
    }

    upperTray = false;

    showCommunicationButtons(node) {
        node.selectAll("#B01,#B02").style("display", "block");
        if (this.upperTray) {
            node.selectAll("#B06,#B04,#B05").style("display", "block");
        }
    }

    hideCommunicationButtons(node) {
        node.selectAll("#B01,#B02").style("display", "none");
        if (this.upperTray) {
            node.selectAll("#B06,#B04,#B05").style("display", "none");
        }
    }

    moveButtons(node, action, t) {
        this.moveLowerTray(node, action, t);
        if (this.upperTray) {
            this.moveUpperTray(node, action, t);
        }
    }

    moveLowerTray(node, action, t) {
        const { BOX_HEIGHT_Expanded, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;

        let bottomNodeConnector = node.select(".connectorDown");
        let bottomConnectorTranslate = "translate(0, 0)"; // collapse

        if (action === "expand") { 
            //Expand the back rectangle
            node.selectAll("#backRect")
            .classed("expanded", true)
            .style("opacity", 1)
            .transition(t)
            .attr("y", BOX_HEIGHT_Expanded)
            bottomConnectorTranslate = `translate(0, ${BOX_HEIGHT_Expanded})`;
        } 

        //move the down connector to the new position
        bottomNodeConnector.transition()
            .duration(EXPANSION_COLLAPSING_DURATION)
            .ease(d3.easeLinear)
            .attr("transform", bottomConnectorTranslate);

    }

    moveUpperTray(node, action, t) {
        const { BOX_HEIGHT_Expanded, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;

        let topNodeConnector = node.select(".connectorUp");
        let topConnectorTranslate = "translate(0, 0)"; // collapse

        if (action === "expand") { 
            //Expand the top tray
            node.selectAll("#topRect")
                .classed("expanded", true)
                .style("opacity", 1)
                .transition(t)
                .attr("y", -BOX_HEIGHT_Expanded)
            topConnectorTranslate = `translate(0, ${-BOX_HEIGHT_Expanded})`;
        }

        // move upper connector
        topNodeConnector.transition()
            .duration(EXPANSION_COLLAPSING_DURATION)
            .ease(d3.easeLinear)
            .attr("transform", topConnectorTranslate);
    }

    updateEdge(d) {
        this.moveLowerConnector(d);
        if (this.upperTray) {
            this.moveUpperConnector(d);
        }
    }
    
    moveLowerConnector(d) {
        const { BOX_HEIGHT_Expanded, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;
        const  id = `L${d.data.target.id}*${d.data.source.id}`;
        const line = d3.select(`[id="${id}"]`);
        
        //For the final conclusion, no edge update is needed
        if (line.empty()) {
            return;
        }

        const oldY = parseFloat(line.attr("y1"));
        let newY = oldY - BOX_HEIGHT_Expanded;
        if (d3.select(`#N${d.data.source.id} #backRect`).classed("expanded")) {
            newY = oldY + BOX_HEIGHT_Expanded;
        }

        line.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .attr("y1", newY);
    }

    moveUpperConnector(d) {
        const { BOX_HEIGHT_Expanded, EXPANSION_COLLAPSING_DURATION } = nodeVisualsDefaults;
       
        if (!d.children) {
            return;
        }

        //For the line connecting to the top connector
        const id = `L${d.data.source.id}*${d.children[0].data.source.id}`;
        const line = d3.select(`[id="${id}"]`);

        const oldY = parseFloat(line.attr("y2"));
        let newY = oldY + BOX_HEIGHT_Expanded;
        if (d3.select(`#N${d.data.source.id} #topRect`).classed("expanded")) {
            newY = oldY - BOX_HEIGHT_Expanded;
        }

        line.transition()
            .duration(EXPANSION_COLLAPSING_DURATION).ease(d3.easeLinear)
            .attr("y2", newY);
    }

    //To get around the typo in the solver
    fixTypo(element) {
        return element !== "Property Domain Transaltion" ? element : "Property Domain Translation";
    }
}