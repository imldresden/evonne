import { nodeVisualsDefaults } from "./node-visuals.js";
import { utils as ruleUtils } from "./rules/rules.js";
import { proof } from "./proof.js";

export class AxiomsHelper {
	constructor() {
		this._socket = undefined;
		this.nodes = undefined;
	}

	set socket(socketIO) {
		this._socket = socketIO;
	}

	addFunctionButtonsToNodes() {
		//Remove old buttons
		d3.selectAll(".axiomButton, .edge-button").remove();
		this.nodes = proof.svg.selectAll(proof.stepNavigator ? ".axiom" : ".node");
		
		//Collapse node children
		this.addCollapse();
		//Expand node children
		this.addExpand();

		
		//Show rule name and premise that led to this conclusion
		this.addShowPrevious();


		//Add a button for highlighting the current inference
		this.addHighlightCurrentInference();

		//Highlight the axiom's justification in the ontology
		this.addHighlightJustificationInOntology();
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
		d3.selectAll(".axiomButton").on("dblclick", (e) => e.stopPropagation());
		//Add pulse effect for unexplored nodes
		this.addCollapsedIndicator();
	}

	countChildren(d, i, prop) {
		if (proof.showRules) {
			if (!d[prop]) {
				d[prop + 'Max'] = i;
				return i;
			}
			return d[prop]
				.map(c => {
					const r =
						this.countChildren(c, i, prop)
						+ (proof.stepNavigator && ruleUtils.isRule(c.data.source.type) ? 0 : 1)
					d[prop + 'Max'] = r - i;
					return r;
				})
				.reduce((a, b) => a + b, 0);
		} else {
			if (!d[prop]) {
				d[prop + 'Max'] = i;
				return i;
			}
			return d[prop]
				.map(c => {
					const r = this.countChildren(c, i, prop) + 1
					d[prop + 'Max'] = r - i;
					return r;
				})
				.reduce((a, b) => a + b, 0);
		}
	}

	conditionToShowPrevious(d) {
		return proof.stepNavigator 
			&& this.get1StepCount(d, 'children') !== this.get1StepCount(d, '_children') 
			&& d._children
			&& d._children.length > 0
	}

	addShowPrevious() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;
		let group = this.nodes
			.filter(d => this.conditionToShowPrevious(d))
			.append("g").attr("id", "B1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2}, ${d.height})`)
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
			.text("Show One Previous")
	}

	get1StepCount(treeRoot, prop) {
		if (!treeRoot[prop]) {
			return 0;
		}
		if (proof.showRules) {
			if (!treeRoot[prop][0][prop]) {
				return 0;
			}
			return treeRoot[prop][0][prop].length;
		} else {
			return treeRoot[prop].length;
		}
	}

	showPrevious(treeRoot) {
		if (proof.isDrawing) {
			return;
		}
		proof.nodeInteracted = treeRoot;
		if (!treeRoot.children) {
			treeRoot.children = treeRoot._children;
		}

		if (proof.showRules) {
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

	conditionToCollapse(d) {
		return d.children;
	}

	addCollapse() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.nodes
			.filter(d => this.conditionToCollapse(d))
			.append("g").attr("id", "B2")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => proof.isCompact ? 
				`translate(${- d.width / 2 - BTN_CIRCLE_SIZE - 5}, ${d.height / 2})` : 
				`translate(${d.width / 2}, 0)`
			)
			.on("click", (e, d) => this.collapse(d, e))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		let icon = "\ue5db"; 
		if (proof.isLinear && !proof.linear.bottomRoot) {
			icon = "\ue5d8";

			if (proof.isCompact) {
				icon = "keyboard_arrow_down";
			}
		}
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text(icon);
		group.append("title")
			.text("Hide Children")
	}

	collapse(treeRoot, e) {
		e.stopPropagation();
		proof.nodeInteracted = treeRoot;
		
		if (treeRoot.children) {
			treeRoot.children = null;
			proof.update();
		}	
	}

	conditionToExpand(d) {
		return !d.children && d._children;
	}

	addExpand() {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.nodes
			.filter(d => this.conditionToExpand(d))
			.append("g").attr("id", "B2")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => proof.isCompact ? 
				`translate(${- d.width / 2 - BTN_CIRCLE_SIZE - 5}, ${d.height / 2})` : 
				`translate(${d.width / 2}, 0)`
			)
			.on("click", (e, d) => this.expand(d, e))
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		let icon = "\ue5d8"; 
		if (proof.isLinear && !proof.linear.bottomRoot) {
			icon = "\ue5db";

			if (proof.isCompact) {
				icon = "keyboard_arrow_right";
			}
		}	
		group.append("text")
			.attr("class", "material-icons")
			.attr("x", 0)
			.attr("y", 0)
			.text(icon);
		group.append("title")
			.text("Expand Children")
	}

	expand(treeRoot, e) {
		e.stopPropagation();
		proof.nodeInteracted = treeRoot;
		
		if (treeRoot._children) {
			treeRoot.children = treeRoot._children;
			proof.update();
		}
	}

	conditionToShowAllPrevious(d) {
		return d.childrenMax !== d._childrenMax
	}

	showAllPrevious(treeRoot, e) {
		e.stopPropagation();
		if (proof.isDrawing) {
			return;
		}
		proof.nodeInteracted = treeRoot;
		let axioms = [];
		this.getAllPreviousAxioms(treeRoot, axioms, (node) => node.id);
		axioms.forEach(nodeID => {
			nodeID = "N" + nodeID;
			const displayFormat = proof.nodeVisuals.nodesDisplayFormat.get(nodeID);
			if (displayFormat !== "textual") {
				const newFormat = proof.shortenAll ? "shortened" : "original";
				proof.nodeVisuals.nodesDisplayFormat.set(nodeID, newFormat);
				proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, newFormat);
			}
		});
		this.resetAllChildren(treeRoot);
		proof.update();
	}

	addHighlightJustificationInOntology() {
		const { BOTTOM_TRAY_WIDTH, BTN_CIRCLE_SIZE, BOX_PADDING } = nodeVisualsDefaults;

		let group = proof.svg.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B01")
			.attr("class", "axiomButton btn-round btn-highlight")
			.attr("transform", d => `translate(${-BOTTOM_TRAY_WIDTH / 2 + 6 * BOX_PADDING}, ${d.height + BTN_CIRCLE_SIZE / 2 + 2})`)
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
		const { BOTTOM_TRAY_WIDTH, BTN_CIRCLE_SIZE, BOX_PADDING } = nodeVisualsDefaults;

		let group = proof.svg.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B02")
			.attr("class", "axiomButton btn-round btn-repairs")
			.attr("transform", d => `translate(${-BOTTOM_TRAY_WIDTH / 2 + 2 * BOX_PADDING}, ${d.height + BTN_CIRCLE_SIZE - 5})`)
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
		const { BTN_CIRCLE_SIZE, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = proof.svg.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B06")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3}, ${-BTN_CIRCLE_SIZE + 5})`)
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
		const { BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = proof.svg.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B04")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 4 * BOX_PADDING}, ${-BTN_CIRCLE_SIZE + 5})`)
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
		const { BTN_CIRCLE_SIZE, BOX_PADDING, TOP_TRAY_WIDTH } = nodeVisualsDefaults;

		let group = proof.svg.selectAll(".axiom")
			.append("g")
			.style("display", "none")
			.attr("id", "B05")
			.attr("class", "axiomButton btn-round btn-set-axiom-string")
			.attr("transform", `translate(${-TOP_TRAY_WIDTH / 3 + 8 * BOX_PADDING}, ${-BTN_CIRCLE_SIZE + 5})`)
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

		const { BOX_PADDING } = nodeVisualsDefaults;

		const group = proof.svg.selectAll(".axiom")
			.filter((d) => d)
			.filter((d) => {
				return proof.nodeVisuals.nodesDisplayFormat.get("N" + d.data.source.id) !== "original";
			})
			.append("g").attr("opacity", 0).attr("id", "B03")
			.attr("class", "axiomButton btn-view")
			.attr("transform", d => `translate(${-(d.width / 2) + BOX_PADDING}, ${d.height})`) // - BOX_PADDING_BOTTOM
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
			axiom: axiom.element,
			id: getSessionId()
		});
	}

	highlightJustificationInOntology(treeRoot) {
		let pre = [proof.nodeVisuals.getLabel(treeRoot.data.source)];
		this.getAllPreviousAxioms(treeRoot, pre, (node) => proof.nodeVisuals.getLabel(node));
		this._socket.emit("highlight in ontology", { id: getSessionId(), pre });
	}

	showJustification(d) {
		const button = document.querySelector("#N" + d.data.source.id + " #B01");
		document.querySelectorAll(`.node:not(#${button.parentElement.id}) .btn-highlight.active`).forEach(b => {
			b.classList.remove("active");
			b.parentElement.dispatchEvent(new MouseEvent("mouseleave"));
		});
		button.classList.add("active");
		this.highlightJustificationInOntology(d);
	}

	getAllPreviousAxioms(treeRoot, axioms, fn) {
		if (!treeRoot._children) {
			return;
		}

		treeRoot._children.forEach(child => {
			if (!ruleUtils.isRule(child.data.source.type)) {
				axioms.push(fn(child.data.source));
			}
			this.getAllPreviousAxioms(child, axioms, fn);
		});
	}

	showConclusionOnly() {
		proof.svg.selectAll(".axiom")
			.filter((d) => {
				return d ? d.data.id === "L-1" : false;
			})
			.each(x => {
				if (x.children) {
					x.children = null;
				}
				proof.update();
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

	help_icon = "help_outline";
	close_help_icon = "highlight_off";

	addHighlightCurrentInference() {
		if (proof.showRules) {
			return;
		}

		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;

		let group = this.nodes
			.append("g").attr("id", "H1")
			.attr("class", "axiomButton btn-round btn-help")
			.attr("transform", d => proof.isCompact ? 
				`translate(${d.width / 2 + BTN_CIRCLE_SIZE}, ${d.height / 2})` : 
				`translate(${-d.width / 2}, ${d.height})`)
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
			.text(this.help_icon);
		group.append("title")
			.text("Highlight inference")
	}

	highlightCurrentInference(event, node) {

		let btn = d3.select("#N" + node.data.source.id).select("#H1 text");
		let state = btn.text();

		if (state === this.help_icon) {
			proof.rules.openExplanation({ event }, [node]);
			btn.text(this.close_help_icon);
		} else {
			proof.rules.destroyExplanation();
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
			title: 'Show Step',
			type: 'button',
			action: (_, d) => this.showPrevious(d),
			filter: (d) => this.conditionToShowPrevious(d)
		},
		{
			title: 'Expand All Children',
			type: 'button',
			action: (e, d) => this.showAllPrevious(d, e),
			filter: (d) => this.conditionToShowAllPrevious(d)

		},
		{
			title: 'Collapse Children',
			type: 'button',
			action: (e, d) => this.collapse(d, e),
			filter: (d) => this.conditionToCollapse(d)
		},
		{
			title: 'Expand Children',
			type: 'button',
			action: (e, d) => this.expand(d, e),
			filter: (d) => this.conditionToExpand(d)
		},
		{
			title: 'Axiom Transformations',
			type: 'section'
		},
		{
			title: 'Show original',
			type: 'button',
			action: (_, d) => this.setAxiomOriginal(d)
		},
		{
			title: 'Show shortened',
			type: 'button',
			action: (_, d) => this.setAxiomShortened(d)
		},
		{
			title: 'Show textual',
			type: 'button',
			action: (_, d) => this.setAxiomTextual(d)
		},
		{
			title: 'Ontology Actions',
			type: 'section'
		},
		{
			title: 'Compute Diagnoses',
			type: 'button',
			action: (_, d) => this.showAxiomRepairs(d)
		},
		{
			title: 'Highlight Justification',
			type: 'button',
			action: (_, d) => this.showJustification(d)
		}
	];
}
