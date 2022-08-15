import { APP_GLOBALS as app, SharedData } from "../shared-data.js";
import { nodeVisualsDefaults } from "./nodeVisualsHelper.js";
import * as lP from "./linearProof/linearProofHelper.js";
import { InferenceRulesHelper } from "./ruleFunctions.js";

export class AxiomFunctionsHelper {
	constructor(socketIO) {
		this._socket = socketIO;
		this._inferredAxiomNodes = undefined;
	}

	addFunctionButtonsToNodes() {
		//Remove old buttons
		d3.selectAll(".axiomButton, .edge-button").remove();
		this._inferredAxiomNodes = d3.select("#proof-view").selectAll(".axiom:not(.asserted)")

		//Show rule name and premise that led to this conclusion
		this.addShowPrevious();
		//Hide everything before the selected node
		this.addHideAllPrevious();
		//Show everything before the selected node
		this.addShowAllPrevious();
		//Highlight the axiom's justification in the ontology
		this.addHighlightJustificationInOntology();
		//Add a button for highlighting the current inference. !Only for linear proofs
		this.addHighlightCurrentInference();
		//Create and display repairs for the axiom that corresponds to the selected node
		this.addShowRepairs();
		//Initializing format buttons
		this.initializeMaps();
		//Set axiom to be displayed in its original format
		this.addSetAxiomOriginal();
		//Set axiom to be displayed in its shortened format
		this.addSetAxiomShortened();
		//Set axiom to be displayed in its textual format
		this.addSetAxiomTextual();
		//Extend the width of the button to show the full axiom
		this.addShowFullAxiom();
		//Hide all buttons
		SharedData.nodeVisualsHelper.initHideAllButtons();
		//Double-clicking a button should not trigger the expand functionality of the node
		d3.selectAll(".axiomButton")
			.on("dblclick", () => d3.event.stopPropagation());
		//Add pulse effect for unexplored nodes
		this.addCollapsedIndicator();
	}

	addShowPrevious() {
		const { BOX_HEIGHT, BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this._inferredAxiomNodes
			.filter(d => {
				if (app.isLinear)
					return d._children;
				return d._children[0]._children
			})//remove tautologies
			.append("g").attr("id", "B1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", (d, i, nodes) => {
				const id = nodes[i].parentNode.id;
				const rect = document.querySelector(`#${id} #frontRect`);
				return `translate(${rect.getAttribute("width") / 2}, ${BOX_HEIGHT})`;
			})
			.on("click", d => this.showPrevious(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.style("font-size", "1.2em")
			.text("\ue314");
		group.append("title")
			.text("Show previous")
	}

	showPrevious(treeRoot) {
		if (app.isDrawing) {
			return;
		}

		if (!treeRoot.children) {
			treeRoot.children = treeRoot._children;
		}

		if (!app.isLinear) {
			if (!treeRoot.children[0].children) {
				treeRoot.children[0].children = treeRoot.children[0]._children
			}

			treeRoot.children[0].children.forEach(child => {
				if (child.children && child.children[0].children) {
					child.children = null
				}
			});
		} else {
			treeRoot.children.forEach(child => {
				if (child.children) {
					child.children = null
				}
			});
		}

		SharedData.advancedUpdate();
	}

	addHideAllPrevious() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this._inferredAxiomNodes
			.filter(d => {
				if (app.isLinear)
					return d._children;
				return d._children[0]._children
			})//remove tautologies
			.append("g").attr("id", "B2")
			.attr("class", "axiomButton btn-round")
			.attr("transform", (d, i, nodes) => {
				const id = nodes[i].parentNode.id;
				const rect = document.querySelector(`#${id} #frontRect`);
				return `translate(${rect.getAttribute("width") / 2 - BTN_CIRCLE_SIZE - 1}, 0)`;
			})
			.on("click", d => this.hideAllPrevious(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("\ue5db");
		group.append("title")
			.text("Hide all previous")
	}
	
	hideAllPrevious(treeRoot) {
		if (app.isDrawing) {
			return;
		}
		if (treeRoot.children) {
			treeRoot.children = null;
			SharedData.advancedUpdate();
		}
	}

	addShowAllPrevious() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this._inferredAxiomNodes
			.filter(d => {
				if (app.isLinear)
					return d._children;
				return d._children[0]._children
			})//remove tautologies
			.append("g").attr("id", "B3")
			.attr("class", "axiomButton btn-round")
			.attr("transform", (d, i, nodes) => {
				const id = nodes[i].parentNode.id;
				const rect = document.querySelector(`#${id} #frontRect`);
				return `translate(${rect.getAttribute("width") / 2}, 0)`;
			})
			.on("click", d => this.showAllPrevious(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("\ue5d8");
		group.append("title")
			.text("Show all previous")
	}
	
	showAllPrevious(treeRoot) {
		if (app.isDrawing) {
			return;
		}
		this.resetAllChildren(treeRoot);
		SharedData.advancedUpdate();
	}

	addHighlightJustificationInOntology() {
		const { BOTTOM_TRAY_WIDTH, BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING } = nodeVisualsDefaults;
		const that = this;
		//let rect = undefined;
		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B01")
			.attr("class", "axiomButton btn-round btn-highlight")
			.attr("transform", () =>
				`translate(${-BOTTOM_TRAY_WIDTH / 2 + 6*BOX_PADDING}, ${1.7*BOX_HEIGHT_Expanded})`
			)
			.on("click", d => this.showJustification(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("search");
		group.append("title")
			.text("Highlight justification in ontology")
	}

	addShowRepairs() {
		const { BOTTOM_TRAY_WIDTH, BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING } = nodeVisualsDefaults;

		//let rect = undefined;
		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B02")
			.attr("class", "axiomButton btn-round btn-repairs")
			.attr("transform", `translate(${-BOTTOM_TRAY_WIDTH / 2 + 2 * BOX_PADDING}, ${1.7*BOX_HEIGHT_Expanded})`)
			.on("click", d => this.showAxiomRepairs(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("build");
		group.append("title")
			.text("Show diagnoses")
	}

	addSetAxiomOriginal() {
		const { BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B06")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 }, ${-BOX_HEIGHT_Expanded/2})`)
			.on("click", this.setAxiomOriginal)
			.each((_,i,n)=>
				this.switchStateOnDraw(n[i],"original"));
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("edit_off");
		group.append("title")
			.text("Show original")
	}

	setAxiomOriginal (d,i,n) {
		let nodeID = "N"+d.data.source.id;
		SharedData.nodesCurrentDisplayFormat.set(nodeID,"original");
		SharedData.nodesDisplayFormat.set(nodeID,"original");
		SharedData.advancedUpdate();
		this.switchStateOnClick(nodeID, n[i].id);
	}
	
	addSetAxiomShortened() {
		const { BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B04")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 4 * BOX_PADDING}, ${-BOX_HEIGHT_Expanded/2})`)
			.on("click", this.setAxiomShortened)
			.each((_,i,n)=>
				this.switchStateOnDraw(n[i],"shortened"));
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("short_text");
		group.append("title")
			.text("Show shortened")
	}

	setAxiomShortened (d,i,n) {
		let nodeID = "N"+d.data.source.id;
		SharedData.nodesDisplayFormat.set(nodeID,"shortened");
		SharedData.nodesCurrentDisplayFormat.set(nodeID,"shortened");
		SharedData.advancedUpdate();
		this.switchStateOnClick(nodeID, n[i].id);
	}

	addSetAxiomTextual() {
		const { BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B05")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 8 * BOX_PADDING}, ${-BOX_HEIGHT_Expanded/2})`)
			.on("click", this.setAxiomTextual)
			.each((_,i,n)=>
				this.switchStateOnDraw(n[i],"textual"));
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text("title");
		group.append("title")
			.text("Show text")
	}
	
	setAxiomTextual (d,i,n) {
		let nodeID = "N"+d.data.source.id;
		SharedData.nodesCurrentDisplayFormat.set(nodeID,"textual");
		SharedData.nodesDisplayFormat.set(nodeID,"textual");
		SharedData.advancedUpdate();
		this.switchStateOnClick(nodeID, n[i].id);
	}
	
	addShowFullAxiom() {
		const { BOX_HEIGHT, BOX_PADDING_BOTTOM, BOX_PADDING } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.filter((d)=>d)
			.filter((d)=>{
				return 	SharedData.nodesDisplayFormat.get("N"+d.data.source.id) !== "original";
			})
			.append("g").attr("opacity", 0).attr("id", "B03")
			.attr("class", "axiomButton btn-view")
			.attr("transform", (d, i, nodes) => {
				const id = nodes[i].parentNode.id;
				const rect = document.querySelector(`#${id} #frontRect`);
				return `translate(${-rect.getAttribute("width") / 2 + BOX_PADDING}, 
					${BOX_HEIGHT - BOX_PADDING_BOTTOM})`;
			})
			.on("click", (d, i, nodes) => {
				this.showFullAxiom(nodes[i].parentNode);
				SharedData.advancedUpdate();
				this.switchStateOnClick("N"+d.data.source.id,
					this.getButton(SharedData.nodesDisplayFormat.get("N"+d.data.source.id)));
			});

		group.append("text")
			.attr("id", "B03Text")
			.attr("class", "material-icons")
			.attr("x", BOX_PADDING)
			.attr("y", 2)
			.text((d, i, nodes) =>
				SharedData.nodesCurrentDisplayFormat.get(nodes[i].parentNode.parentNode.id) === "original" ? "\ue8f5" : "\ue8f4");

		group.append("title")
			.text((d, i, nodes) => SharedData.nodesCurrentDisplayFormat.get(nodes[i].parentNode.parentNode.id) === "original" ? "Show formatted axiom" : "Show original axiom")
	}

	repairing = false;
	showAxiomRepairs(d) {
		const button = document.querySelector("#N"+d.data.source.id + " #B02");
		
		if (!this.repairing) {
			document.querySelectorAll(".btn-repairs").forEach(button => button.classList.remove("active"));
			button.classList.add("active");
			button.classList.add("spinning");
			if (button.querySelector("text")) {
				button.querySelector("text").innerHTML = "autorenew";
			}
			this.showRepairs(d.data.source)
			this.repairing = true;
		}

		const socket = io();
		socket.on('read repairs', () => {
			this.repairing = false
			if (button.querySelector("text")) {
				button.querySelector("text").innerHTML = "build";
			} 
			button.classList.remove("spinning")
		});
	}

	showRepairs(axiom) {
		this._socket.emit("get ontology", { 
			axiom: axiom.mselement, 
			readableAxiom: axiom.element, 
			id: getSessionId() 
		});
	}

	highlightJustificationInOntology(treeRoot) {
		let pre = [treeRoot.data.source.element];
		this.getAllPreviousAxioms(treeRoot, pre);
		this._socket.emit("highlight in ontology", { id: getSessionId(), pre });
	}

	showJustification(d) {
		const button = document.querySelector("#N"+d.data.source.id + " #B01");
		document.querySelectorAll(`.node:not(#${button.parentElement.id}) .btn-highlight.active`).forEach(b => {
			b.classList.remove("active");
			b.parentElement.dispatchEvent(new MouseEvent("mouseleave"));
		});
		const active = button.classList.toggle("active");
		if (active) {
			this.highlightJustificationInOntology(d);
		} else { 
			restoreColor();
		}
	}

	

	getAllPreviousAxioms(treeRoot, axioms) {
		if (!treeRoot._children) {
			return;
		}

		treeRoot._children.forEach(child => {
			if (child.data.source.type !== "rule") {
				axioms.push(child.data.source.element);
			}
			this.getAllPreviousAxioms(child, axioms);
		});
	}

	showConclusionOnly() {
		d3.selectAll(".axiom")
			.filter(d => {
				return d ? d.data.id === "L-1" : false;
			})
			.each(x => {
				if (x.children) {
					x.children = null;
				}
				SharedData.update(x);
			});

	}

	resetAllChildren(treeRoot) {
		treeRoot.children = treeRoot._children;
		if (treeRoot.children) {
			treeRoot.children.forEach(child => {
				this.resetAllChildren(child);
			});
		}
	}

	showFullAxiom(parentNode) {
		if (SharedData.nodesCurrentDisplayFormat.get(parentNode.id)!=="original") {
			SharedData.nodesCurrentDisplayFormat.set(parentNode.id,"original");
		} else {
			SharedData.nodesCurrentDisplayFormat.set(parentNode.id, SharedData.nodesDisplayFormat.get(parentNode.id));
		}
	}

	addCollapsedIndicator() {
		d3.selectAll(".collapse-indicator").remove();
		d3.select("#proof-view")
			.selectAll(".axiom:not(.asserted) #frontRect")
			.filter(y => !y.children && y._children)
			.nodes()
			.forEach(node => {
				const offset = 3;
				for (let i = 1; i < 3; i++) {
					d3.select(node.parentElement)
						.append("rect")
						.attr("class", "collapse-indicator")
						.attr("x", parseInt(d3.select(node).attr("x")) + i * offset)
						.attr("y", parseInt(d3.select(node).attr("y")) - i * offset)
						.attr("width", d3.select(node).attr("width"))
						.attr("height", d3.select(node).attr("height"))
						.style("fill", `hsla(207, 89%, ${70 + i * 8}%, 1)`)
						.lower()
				}
				d3.select(node.parentElement)
					.select(".connectorUp")
					.style("opacity", 0)
			})
	}

	addHighlightCurrentInference() {
		if (!app.isLinear)
			return;
		const { BOX_HEIGHT, BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this._inferredAxiomNodes
			.filter(d => { return d._children; })//remove tautologies
			.append("g").attr("id", "H1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", (d, i, nodes) => {
				const id = nodes[i].parentNode.id;
				const rect = document.querySelector(`#${id} #frontRect`);
				return `translate(${rect.getAttribute("width") / 2 - BTN_CIRCLE_SIZE - 1}, ${BOX_HEIGHT})`;
			})
			.on("click", d => this.highlightCurrentInference(d))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.style("font-size", "1.2em")
			.text("\ue1b7");
		group.append("title")
			.text("Highlight inference")
	}

	inferenceRulesHelper = new InferenceRulesHelper();

	highlightCurrentInference(nodeData) {
		d3.selectAll("body .tooltip-explanation").remove();
		let btn = d3.select("#N" + nodeData.data.source.id).select("#H1 text");
		let state = btn.text();

		if (state === "\ue1b7") {
			d3.selectAll("#H1 text").text("\ue1b7");
			lP.highlightCurrentInference(nodeData);

			let tooltip = d3.select("body").append("div").attr("class", "tooltip-explanation").attr("id", "toolTipID");
			let ruleName = nodeData.data.source.ruleName;
			let conclusion = nodeData.data.source.element;
			let premise = [];

			if (nodeData.children) {
				nodeData.children.forEach(child => premise.push(child.data.source.element));
			}

			this.inferenceRulesHelper.addExplanation(premise, conclusion, ruleName, tooltip);
			app.ruleExplanationPosition === "mousePosition"
				? this.inferenceRulesHelper.setPositionRelativeToMouse(tooltip)
				: tooltip.classed(this.inferenceRulesHelper.getPositionClass(app.ruleExplanationPosition), true);

			btn.text("\ue1b6");
		} else {
			lP.setFullOpacityToAll();
			btn.text("\ue1b7");
		}
	}

	switchStateOnClick(nodeID, buttonID){
		nodeID = "#" + nodeID;
		d3.select(nodeID).selectAll(".btn-set-axiom-string").each((_,i,n)=>{
			if (n[i].id === buttonID)
				this.activate(n[i]);
			else
				this.deactivate(n[i]);
		})
	}

	switchStateOnDraw(node, format){
		if (SharedData.nodesDisplayFormat.get(node.parentNode.id) === format){
			node.classList.add("activeFormat");
			node.classList.remove("inactiveFormat");
		}
		else {
			node.classList.add("inactiveFormat");
			node.classList.remove("activeFormat");
		}
	}

	activate(button){
		button.classList.remove("inactiveFormat")
		button.classList.add("activeFormat")
	}

	deactivate(button){
		button.classList.remove("activeFormat")
		button.classList.add("inactiveFormat")
	}

	getButton(format){
		if(format === "textual")
			return "B05";
		else if (format === "shortened")
			return "B04";
		return "B06";
	}

	initializeMaps() {
		d3.selectAll(".axiom,.rule").each(d=>{
			if(d)
				if (!SharedData.nodesDisplayFormat.has("N" + d.data.source.id)){
					SharedData.nodesDisplayFormat.set("N" + d.data.source.id, "original");
					SharedData.nodesCurrentDisplayFormat.set("N" + d.data.source.id, "original");
				}
		});
	}

	menuItems = [
		{
			title: 'Proof Tree Collapsing',
			type: 'section'
		},
		{
			title: 'Show previous',
			type: 'button',
			action: (d, i, n) => {
				this.showPrevious(d);
			}
		},
		{
			title: 'Show all previous',
			type: 'button',
			action: (d, i, n) => {
				this.showAllPrevious(d)
			}
		},
		{
			title: 'Hide all previous',
			type: 'button',
			action: (d, i, n) => {
				this.hideAllPrevious(d)
			}
		},
		{
			title: 'Axiom Transformations',
			type: 'section'
		},
		{
			title: 'Show original',
			type: 'button',
			action: (d, i, n) => {
				this.setAxiomOriginal(d, i, n);
			}
		},
		{
			title: 'Show shortened',
			type: 'button',
			action: (d, i, n) => {
				this.setAxiomShortened(d, i, n);
			}
		},
		{
			title: 'Show textual',
			type: 'button',
			action: (d, i, n) => {
				this.setAxiomTextual(d, i, n);
			}
		},
		{
			title: 'Ontology Actions',
			type: 'section'
		},
		{
			title: 'Compute Diagnoses',
			type: 'button',
			action: (d, i, n) => {
				this.showAxiomRepairs(d);
			}
		},
		{
			title: 'Highlight Justification in Ontology',
			type: 'button',
			action: (d, i, n) => {
				this.showJustification(d);
			}
		}
	];
}
