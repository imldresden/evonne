import { nodeVisualsDefaults } from "./node-visuals.js";
import { utils as ruleUtils } from "./rules/rules.js";
import { proof } from "./proof.js";

export class AxiomsHelper {
	constructor() {
		this._socket = undefined;
		this.axioms = undefined;
	}

	set socket(socketIO) {
		this._socket = socketIO;
	}

	addFunctionButtonsToNodes() {
		//Remove old buttons
		d3.selectAll(".axiomButton, .edge-button").remove();
		this.axioms = proof.svg.selectAll(".axiom")

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
		proof.nodeVisuals.initHideAllButtons();
		//Double-clicking a button should not trigger the expand functionality of the node
		d3.selectAll(".axiomButton")
			.on("dblclick", (e) => e.stopPropagation());
		//Add pulse effect for unexplored nodes
		this.addCollapsedIndicator();
	}

	addShowPrevious() {
		const { BOX_HEIGHT, BTN_CIRCLE_SIZE } = nodeVisualsDefaults;
		let group = this.axioms
			.filter(d => d._children[0]._children) //remove tautologies
			.append("g").attr("id", "B1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2}, ${BOX_HEIGHT})`)
			.on("click", (_, d) => this.showPrevious(d))
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
		if (proof.isDrawing) {
			return;
		}
		proof.nodeInteracted = treeRoot;
		if (!treeRoot.children) {
			treeRoot.children = treeRoot._children;
		}

		if (!proof.isLinear) {
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

		proof.update();
	}

	addHideAllPrevious() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.axioms
			.filter(d => d._children[0]._children) //remove tautologies
			.append("g").attr("id", "B2")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2 - BTN_CIRCLE_SIZE - 1}, 0)`)
			.on("click", (_, d) => this.hideAllPrevious(d))
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
		if (proof.isDrawing) {
			return;
		}
		proof.nodeInteracted = treeRoot;
		if (treeRoot.children) {
			treeRoot.children = null;
			proof.update();
		}
	}

	addShowAllPrevious() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.axioms
			.filter(d => d._children[0]._children ) //remove tautologies
			.append("g").attr("id", "B3")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2}, 0)`)
			.on("click", (_, d) => this.showAllPrevious(d))
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
		if (proof.isDrawing) {
			return;
		}
		proof.nodeInteracted = treeRoot;
		this.resetAllChildren(treeRoot);
		proof.update();
	}

	addHighlightJustificationInOntology() {
		const { BOTTOM_TRAY_WIDTH, BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING } = nodeVisualsDefaults;
		
		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B01")
			.attr("class", "axiomButton btn-round btn-highlight")
			.attr("transform", () =>
				`translate(${-BOTTOM_TRAY_WIDTH / 2 + 6 * BOX_PADDING}, ${1.7 * BOX_HEIGHT_Expanded})`
			)
			.on("click", (_, d) => this.showJustification(d))
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

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B02")
			.attr("class", "axiomButton btn-round btn-repairs")
			.attr("transform", `translate(${-BOTTOM_TRAY_WIDTH / 2 + 2 * BOX_PADDING}, ${1.7 * BOX_HEIGHT_Expanded})`)
			.on("click", (_, d) => this.showAxiomRepairs(d))
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
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3}, ${-BOX_HEIGHT_Expanded / 2})`)
			.on("click", (_, d) => this.setAxiomOriginal(d))
			.each((_, i, n) =>
				this.switchStateOnDraw(n[i], "original"));
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

	setAxiomOriginal(d) {
		let nodeID = "N" + d.data.source.id;
		proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "original");
		proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "original");
		proof.update();
		this.switchStateOnClick(nodeID, nodeID);
	}

	addSetAxiomShortened() {
		const { BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B04")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 4 * BOX_PADDING}, ${-BOX_HEIGHT_Expanded / 2})`)
			.on("click", (_, d) => this.setAxiomShortened(d))
			.each((_, i, n) =>
				this.switchStateOnDraw(n[i], "shortened"));
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

	setAxiomShortened(d) {
		let nodeID = "N" + d.data.source.id;
		proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "shortened");
		proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "shortened");
		proof.update();
		this.switchStateOnClick(nodeID, nodeID);
	}

	addSetAxiomTextual() {
		const { BOX_HEIGHT_Expanded, BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = d3.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B05")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 8 * BOX_PADDING}, ${-BOX_HEIGHT_Expanded / 2})`)
			.on("click", (_, d) => this.setAxiomTextual(d))
			.each((_, i, n) =>
				this.switchStateOnDraw(n[i], "textual"));
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

	setAxiomTextual(d) {
		let nodeID = "N" + d.data.source.id;
		proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "textual");
		proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "textual");
		proof.update();
		this.switchStateOnClick(nodeID, nodeID);
	}

	addShowFullAxiom() {

		function showFullAxiom(parentNode) {
			if (proof.nodeVisuals.nodesCurrentDisplayFormat.get(parentNode.id) !== "original") {
				proof.nodeVisuals.nodesCurrentDisplayFormat.set(parentNode.id, "original");
			} else {
				proof.nodeVisuals.nodesCurrentDisplayFormat.set(parentNode.id, proof.nodeVisuals.nodesDisplayFormat.get(parentNode.id));
			}
		}

		const { BOX_HEIGHT, BOX_PADDING_BOTTOM, BOX_PADDING } = nodeVisualsDefaults;

		const group = d3.selectAll(".axiom")
			.filter((d) => d)
			.filter((d) => {
				return proof.nodeVisuals.nodesDisplayFormat.get("N" + d.data.source.id) !== "original";
			})
			.append("g").attr("opacity", 0).attr("id", "B03")
			.attr("class", "axiomButton btn-view")
			.attr("transform", d=> `translate(${-(d.width / 2) + BOX_PADDING}, ${BOX_HEIGHT - BOX_PADDING_BOTTOM})`)
			.on("click", (e, d) => {
				showFullAxiom(e.currentTarget.parentNode);
				proof.update();
				this.switchStateOnClick("N" + d.data.source.id,
					this.getButton(proof.nodeVisuals.nodesDisplayFormat.get("N" + d.data.source.id)));
			});

		group.append("text")
			.attr("id", "B03Text")
			.attr("class", "material-icons")
			.attr("x", BOX_PADDING)
			.attr("y", 2)
			.text((d, i, nodes) =>
				proof.nodeVisuals.nodesCurrentDisplayFormat.get(nodes[i].parentNode.parentNode.id) === "original" ? "\ue8f5" : "\ue8f4");

		group.append("title")
			.text((d, i, nodes) => proof.nodeVisuals.nodesCurrentDisplayFormat.get(nodes[i].parentNode.parentNode.id) === "original" ? "Show formatted axiom" : "Show original axiom")
	}

	repairing = false;

	showAxiomRepairs(d) {
		const button = document.querySelector("#N" + d.data.source.id + " #B02");

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
			axiom: axiom.mSElement,
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
		const button = document.querySelector("#N" + d.data.source.id + " #B01");
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
			if (!ruleUtils.isRule(child.data.source.type)) {
				axioms.push(child.data.source.element);
			}
			this.getAllPreviousAxioms(child, axioms);
		});
	}

	showConclusionOnly() {
		d3.selectAll(".axiom")
			.filter((d) => {
				return d ? d.data.id === "L-1" : false;
			})
			.each(x => {
				if (x.children) {
					x.children = null;
				}
				proof.update(x);
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

	addCollapsedIndicator() {
		d3.selectAll(".collapse-indicator").remove();
		proof.svg
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
			})
	}

	addHighlightCurrentInference() {
		const { BOX_HEIGHT, BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.axioms
			.append("g").attr("id", "H1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${-d.width / 2}, ${BOX_HEIGHT})`)
			.on("click", (e, d) => this.highlightCurrentInference(e, d))
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

	highlightCurrentInference(event, nodeData) {
		let conclusion = nodeData.data.source.element;
		let premises = [];

		if (nodeData.children) {
			nodeData.children.forEach(child => premises.push(child.data.source.element));
		}

		proof.rules.showExplanation(event, {
			premises,
			conclusion,
			data: {
				source: {
					id: nodeData.data.id,
					element: nodeData.data.rule.label,
					type: nodeData.data.rule.type
				}
			}
		});

		let btn = d3.select("#N" + nodeData.data.source.id).select("#H1 text");
		let state = btn.text();

		if (state === "\ue1b7") {
			d3.selectAll("#H1 text").text("\ue1b7");
			proof.linear.highlightCurrentInference(nodeData);
			btn.text("\ue1b6");
		} else {
			proof.linear.setFullOpacityToAll();
			btn.text("\ue1b7");
		}
	}

	switchStateOnClick(nodeID, buttonID) {
		function activate(button) {
			button.classList.remove("inactiveFormat")
			button.classList.add("activeFormat")
		}

		function deactivate(button) {
			button.classList.remove("activeFormat")
			button.classList.add("inactiveFormat")
		}

		nodeID = "#" + nodeID;
		d3.select(nodeID).selectAll(".btn-set-axiom-string").each((_, i, n) => {
			if (n[i].id === buttonID) {
				activate(n[i]);
			} else {
				deactivate(n[i]);
			}
		})
	}

	switchStateOnDraw(node, format) {
		if (proof.nodeVisuals.nodesDisplayFormat.get(node.parentNode.id) === format) {
			node.classList.add("activeFormat");
			node.classList.remove("inactiveFormat");
		} else {
			node.classList.add("inactiveFormat");
			node.classList.remove("activeFormat");
		}
	}

	getButton(format) {
		if (format === "textual") {
			return "B05";
		} else if (format === "shortened") {
			return "B04";
		}
		return "B06";
	}

	initializeMaps() {
		d3.selectAll(".axiom,.rule").each(d => {
			if (d && !proof.nodeVisuals.nodesDisplayFormat.has("N" + d.data.source.id)) {
				proof.nodeVisuals.nodesDisplayFormat.set("N" + d.data.source.id, "original");
				proof.nodeVisuals.nodesCurrentDisplayFormat.set("N" + d.data.source.id, "original");
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
			action: (_, d) => {
				this.showPrevious(d);
			}
		},
		{
			title: 'Show all previous',
			type: 'button',
			action: (_, d) => {
				this.showAllPrevious(d)
			}
		},
		{
			title: 'Hide all previous',
			type: 'button',
			action: (_, d) => {
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
			action: (_, d) => {
				this.setAxiomOriginal(d);
			}
		},
		{
			title: 'Show shortened',
			type: 'button',
			action: (_, d) => {
				this.setAxiomShortened(d);
			}
		},
		{
			title: 'Show textual',
			type: 'button',
			action: (_, d) => {
				this.setAxiomTextual(d);
			}
		},
		{
			title: 'Ontology Actions',
			type: 'section'
		},
		{
			title: 'Compute Diagnoses',
			type: 'button',
			action: (_, d) => {
				this.showAxiomRepairs(d);
			}
		},
		{
			title: 'Highlight Justification',
			type: 'button',
			action: (_, d) => {
				this.showJustification(d);
			}
		}
	];
}
