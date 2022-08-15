
import { APP_GLOBALS as app, SharedData } from "../shared-data.js";
import { nodeVisualsDefaults as config } from './nodeVisualsHelper.js';

//The following works under the following assumptions
//			- functions in axiomFunctions.js are accessible
//			- there exists a global variable called "hierarchy"

//Call "addFunctionButtonsToLinks(inputArray)" to add a detach button 
//to each edge in inputArray
//===================================================================

let restOfProofNode = { id: "r0", element: "", type: "rest" };
let edgeGroups, edgePaths, edgeLabels;

export class LinkFunctionsHelper {
	constructor() {
	}

	addFunctionButtonsToLinks(removableEdges) {

		/* edgeGroups ? app.svg.selectAll(".edgeGroup")
			.data(removableEdges)
			.join("g")
			.attr("class", ".edgeGroup")
			. */

		/* edgePaths = app.svg.selectAll(".edgepath")
			.data(removableEdges)
			.join("path")
			.attr('d', d => `M ${d.target.x0} ${app.contentHeight - parseInt(d.target.y0)} L ${d.source.x0} ${app.contentHeight - parseInt(d.source.y0)}`)
			.attr('class', 'edgepath')
			.attr('fill-opacity', 0)
			.attr('stroke-opacity', 0)
			.attr('id', (d, i) => 'edgepath' + i)
			.style("pointer-events", "none"); */

		let edgeButtons = SharedData.buttons.selectAll(".edge-button")
			.data(removableEdges)
			.join(
				enter => {
					/*const that = this;
					const { BOX_HEIGHT, CONNECTOR_SIZE } = config;
					const direction = "Down"
					let directionClass = "connector" + direction;
					let selection = undefined;
					let connector = undefined;
					let circleAttributes = {
						cx: ["cx", 0],
						cy: ["cy", direction === "Up" ? 0 : BOX_HEIGHT+ 5],
						r: ["r", CONNECTOR_SIZE / 2]
					};
					
					//get axioms nodes
					let elements = d3.selectAll(".node.axiom");
					console.log(elements)
					//remove old connectors
					//elements.selectAll("." + directionClass).remove();
					//add new connectors
					elements.each(function () {
						selection = d3.select(this);
						//Skip conclusion for bottom connectors
						if (selection.classed("conclusion"))
							return;
						
						connector = selection.append("circle");
						Object.values(circleAttributes).forEach(value => {
							selection.select("." + directionClass)
								.attr(value[0], value[1])
								.attr("cursor", "pointer")
								.on("click", d => {
									that.showSubTree(d.target);
								});
						});
					});*/
			
					let group = enter.append("g")
						.attr("class", "edge-button")
						.attr('id', d => 'detachButtonN' + d.target.data.source.id)
						.attr("cursor", "pointer")
						.attr("transform", d => {
							const { source: s, target: t } = d;
							return `translate(${t.x + (s.x - t.x) / 2}, ${app.contentHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
						})

					group
						.append("circle")
						.attr("cx", 0)
						.attr("cy", -8)
						.attr("r", 14)
						.attr("fill", "#ccc")

					group
						.append("text")
						.attr('class', 'edgelabel material-icons')
						.style('font-size', '16px')
						.style('fill', 'white')
						.text('\ue14e')
						.attr("text-anchor", "middle")

					group
						.filter(() => this.id !== 'detachButton' + SharedData.nodeWithVisibleButtons.id)
						.style("opacity", 0)

					group
						.on("click", d => {
							this.showSubTree(d.target);
						});
						
				},
				update => update.selectAll("edge-button")
					.attr("transform", d => {
						const { source: s, target: t } = d;
						return `translate(${t.x + (s.x - t.x) / 2}, ${app.contentHeight - t.y - 1.5 * (s.y - t.y) / 2})`;
					}),
				exit => exit.remove()
			)
	}

	removeFunctionButtonsToLinks(){
		d3.selectAll(".edge-button").remove();
	}

	showSubTree(root) {
		//extract the current data
		let originalEdgeData = this.extractOriginalData(root);
		//reset all children to show the entire subtree, defined in axiomFunctions.js
		SharedData.axiomFunctionsHelper.resetAllChildren(root);
		//extract the data of the subtree
		let newEdgesData = this.extractData(root);
		//create a new hierarchy
		let newHierarchy = SharedData.createHierarchy(newEdgesData);
		SharedData.updateHierarchyVars(newHierarchy);
		//preserve previous sub-structure
		let previousHierarchy = SharedData.createHierarchy(originalEdgeData);
		SharedData.updateHierarchyVars(previousHierarchy);
		let found;
		newHierarchy.children[0].descendants().forEach(x => {
			found = previousHierarchy.descendants().find(y => y.data.source.id === x.data.source.id);
			if (found && !found.children) {
				x.children = null;
			}
		});
		//update the graph
		SharedData.updateHierarchy(newHierarchy);
	}

	extractOriginalData(root) {
		let data = [
			{
				id: "L-1",
				source: root.data.source,
				target: ""
			}
		];

		root.links().forEach(entry => data.push(entry.target.data));
		return data;
	}

	extractData(root) {
		let data = [
			{
				id: "L-1",
				source: restOfProofNode,
				target: ""
			},
			{
				id: "rest",
				source: root.data.source,
				target: restOfProofNode
			}

		];
		root.links().forEach(entry => data.push(entry.target.data));
		return data;
	}


}