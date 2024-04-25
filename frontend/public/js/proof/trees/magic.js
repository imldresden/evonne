import { nodeVisualsDefaults } from "../node-visuals.js";
import { proof } from "../proof.js";

let axiomNodesButConclusion, axiomNodes, inferredAxiomNodes;
let newMagicBoxCounter = 0, newEdgeIDCounter = 0;

export class MagicNavigation {
	constructor() {
		this._entireProofHierarchy = undefined;
	}

	set entireProofHierarchy(originalHierarchy) {
		this._entireProofHierarchy = originalHierarchy;
	}

	currentMagicAction = undefined;

	getInitialMagicalHierarchy(data) {
		let result = [];
		let magicBox = this.getNewMagicBox();
		let fake = data.find((x) => x.id === "L-1");
		structuredClone(data)
			.filter((x) => x.source.element === "Asserted Conclusion")
			.forEach((x) => {
				result.push(x);
				result.push(
					this.getNewEdge(x.target, magicBox)
				);
			});
		result.push(
			this.getNewEdge(magicBox, fake.source)
		);
		result.push(fake);
		return result;
	}

	addMagicNavButtonsToNodes() {
		const div = proof.svg;
		axiomNodes = div.selectAll(".axiom");
		axiomNodesButConclusion = div.selectAll(".axiom:not(.conclusion)");
		inferredAxiomNodes = div.selectAll(".axiom:not(.asserted)");

		//Remove old buttons
		div.selectAll(".axiomButton").remove();

		//Add a button to pull an axiom downwards (reveal the premise)
		this.addPullDown();
		//Add a button to push an axiom downwards (hide the conclusion)
		this.addPushDown();
		//Add a button to pull an axiom upwards (reveal the conclusion)
		this.addPullUp();
		//Add a button to push an axiom upwards (hide the premise)
		this.addPushUp();
		//Highlight the axiom's justification in the ontology
		proof.axioms.addHighlightJustificationInOntology();
		//Create and display repairs for the axiom that corresponds to the selected node
		proof.axioms.addShowRepairs();
		//Initializing format buttons
		proof.axioms.initializeMaps();
		//Set axiom to be displayed in its original format
		proof.axioms.addSetAxiomOriginal();
		//Set axiom to be displayed in its shortened format
		proof.axioms.addSetAxiomShortened();
		//Set axiom to be displayed in its textual format
		proof.axioms.addSetAxiomTextual();
		//Extend the width of the button to show the full axiom
		proof.axioms.addShowFullAxiom();
		//Hide all buttons
		proof.nodeVisuals.initHideAllButtons();
	}

	addPullDown() {
		let group = inferredAxiomNodes.filter(d => {
			return d ? d.children[0].data.source.type === "mrule" : false;
		})
			.append("g")
			.attr("id", "B1")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${-(d.width / 2)}, 0)`)
			.on("click", (_, d) => this.pullDown(d))
			.on("hover", (_, d) => this.pullDownHover(d));

		this.appendCircleAndText(group, "keyboard_capslock", "Pull down", "rotated"); //vertical_align_bottom, expand_more
	}

	addPushDown() {
		const { BOX_HEIGHT } = nodeVisualsDefaults;

		let group = axiomNodesButConclusion
			.filter(d => d ? d.children[0].children : false)
			.append("g")
			.attr("id", "B4")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2}, ${BOX_HEIGHT})`)
			.on("click", (_, d) => this.pushDown(d))
			.on("hover", (_, d) => this.pushDownHover(d));

		this.appendCircleAndText(group, "exit_to_app", "Push down", "rotated-90"); // file_download, vertical_align_bottom, system_update_alt
	}

	addPullUp() {
		const { BOX_HEIGHT } = nodeVisualsDefaults;

		let group = axiomNodesButConclusion
			.filter(d =>  d ? d.data.target.type === "mrule" : false)
			.append("g")
			.attr("id", "B3")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d =>`translate(${-d.width / 2}, ${BOX_HEIGHT})`)
			.on("click", (_, d) => this.pullUp(d))
			.on("hover", (_, d) => this.pullUpHover(d));

		this.appendCircleAndText(group, "keyboard_capslock", "Pull up"); //vertical_align_top, expand_less
	}

	addPushUp() {
		let group = axiomNodesButConclusion.filter(d => {
			return d ? d.children[0].children : false;
		})
			.append("g")
			.attr("id", "B2")
			.attr("class", "axiomButton btn-round")
			.attr("transform", d => `translate(${d.width / 2}, 0)`)
			.on("click", (_, d) => this.pushUp(d))
			.on("hover", (_, d) => this.pushUpHover(d));

		this.appendCircleAndText(group, "exit_to_app", "Push up", "rotated-270"); //publish, vertical_align_top
	}

	//create the new hierarchy and update
	updateAll(data, action) {
		proof.tree.hierarchy = proof.tree.createHierarchy(this.orderStructure(data));
		this.currentMagicAction = action;
		proof.update();
	}

	//return True if every element of the premise of the current magic rule 
	//has an equivalent in the original structure which is a descendent of the current conclusion
	//also, this function stores all magic premise elements that are used to infer treeRoot
	isCurrentMagicNeeded(current, currentAtOriginal, usedMagicPremises, restMagicPremises) {
		let newPremiseElement = currentAtOriginal.parent;
		let childrenOfMagic = current.parent.children;
		childrenOfMagic.forEach(x => {
			if (!newPremiseElement.descendants().some(y => y.data.source.id === x.data.source.id)) {
				restMagicPremises.push(x);
			} else {
				usedMagicPremises.push(x);
			}
		});

		//if there are no rest in magic, then it is not needed
		if (restMagicPremises.length === 0) {
			return false;
		}

		//if the new conclusion is the magic conclusion, no magic is needed 
		if (currentAtOriginal.parent.data.target.id === current.parent.data.target.id) {
			return false;
		}

		//take a look ahead, if the new conclusion is a premise of for the next rule, and all that premise is 
		//part of the rest of the premise of the magic rule, then it is not needed any more
		newPremiseElement = this._entireProofHierarchy.descendants().find(x => x.data.source.id === currentAtOriginal.parent.data.target.id);
		if (!newPremiseElement.parent) {
			return false;
		}


		//if looking head does not give the current magic conclusion, then magic is needed
		if (newPremiseElement.parent.data.target.id !== current.parent.data.target.id) {
			return true;
		}

		let newPremiseInOriginal = newPremiseElement.parent.children.filter(x => x !== newPremiseElement);
		let tmp = [...restMagicPremises];

		let found = null;
		for (let i = 0; i < newPremiseInOriginal.length; i++) {
			found = restMagicPremises.find(x => x.data.source.id === newPremiseInOriginal[i].data.source.id)
			if (found) {
				tmp = tmp.filter(x => x.data.source.id !== found.data.source.id)
			}
		}
		return tmp.length !== 0;

	}

	checkIfNewMagicIsNeeded(treeRoot, mainRoot) {
		if (treeRoot.children == null) {
			return false;
		}

		if (treeRoot.children[0].children == null) {
			return false;
		}

		let premise = treeRoot.children[0].children;
		let toCheck, found;
		for (let i = 0; i < premise.length; i++) {
			if (mainRoot.descendants().some(x => x.data.source.id === premise[i].data.source.id)) {
				continue;
			}

			if (premise[i].children != null && premise[i].children[0].children != null) {
				toCheck = premise[i].children[0].children;
				for (let j = 0; j < toCheck.length; j++) {
					found = mainRoot.descendants()
						.find(x => x.data.source.id === toCheck[j].data.source.id && x.data.target.id === toCheck[j].data.target.id);
					if (!found) {
						return true;
					}
				}
			}
		}
		return false;
	}

	pullUpHover(treeRoot) {
		console.log(treeRoot)
	}

	pushUpHover(treeRoot) {
		console.log(treeRoot)
	}

	pullDownHover(treeRoot) {
		console.log(treeRoot)
	}

	pushDownHover(treeRoot) {
		console.log(treeRoot)
	}

	pullUp(treeRoot) {
		const magicImpossible = treeRoot.parent == null || treeRoot.data.target.type !== "mrule";
		if (proof.isDrawing || magicImpossible) {
			return;
		}
		
		let newData = [], usedMagicPremises = [], restMagicPremises = [];
		let currentAtOriginal = this._entireProofHierarchy.descendants().find(x => x.data.source.id === treeRoot.data.source.id);

		//add everything above the pulled axiom
		treeRoot.descendants().filter(x => x !== treeRoot).forEach(x => {
			newData.push(x.data);
		});

		//add the conclusion of the new rule
		newData.push(currentAtOriginal.parent.data);

		//add the edge from pulled to the conclusion
		newData.push(currentAtOriginal.data);

		let restOfNewPremise = currentAtOriginal.parent.children.filter(x => x !== currentAtOriginal);
		let mainRoot = this.getRoot(treeRoot);
		let childrenOfMagic = treeRoot.parent.children;
		let newMagicBox, alreadyThere, found;

		//add the rest of the premise of the new rule
		restOfNewPremise.forEach(x => {
			//add the edge that connect this premise to the new rule
			newData.push(x.data)
			//check if the new premise is already a premise of the magic rule, if so keep it and all its descendants
			alreadyThere = treeRoot.parent.children.filter(y => y !== treeRoot).find(y => y.data.source.id === x.data.source.id);
			if (alreadyThere != null) {
				alreadyThere.descendants().filter(y => y !== alreadyThere).forEach(y => {
					newData.push(y.data);
				});
				//usedMagicPremises.push(alreadyThere.data);
				return;
			}
			let premiseNewMagicNeeded = this.checkIfNewMagicIsNeeded(x, this.getRoot(treeRoot));
			console.log("is new Magic needed " + premiseNewMagicNeeded);
			if (premiseNewMagicNeeded) {
				newMagicBox = this.getNewMagicBox();
				newData.push(this.getNewEdge(newMagicBox, x.data.source));
				x.descendants().filter(y => y !== x).forEach(y => {
					found = childrenOfMagic.find(z => z.data.source.id === y.data.source.id);
					if (found) {
						newData.push(this.getNewEdge(found.data.source, newMagicBox));
						found.descendants().filter(z => z !== found).forEach(z => newData.push(z.data));
					}
				});
			} else {
				//add the rule to conclusion edge
				newData.push(x.children[0].data);

				//if the rule is a tautology, then stop
				if (!x.children[0].children) {
					return;
				}

				//if new magic is not needed because some premise is already there,
				//then the data that should be added regarding them is from the current structure
				let found;
				x.children[0].children.forEach(premise => {
					console.log("premise", premise);
					found = treeRoot.parent.descendants().find(y => y.data.source.id === premise.data.source.id)
					if (found) {
						found.descendants().filter(y => y !== found).forEach(y => newData.push(y.data));
						newData.push(premise.data);
					} else {
						premise.descendants().forEach(y => newData.push(y.data));
					}
				});
			}
		});
		//decide if the current magic box is still needed.
		//if yes, all premise elements that haven't been used so far should be added + their descendants
		let currentMagicIsNeeded = this.isCurrentMagicNeeded(treeRoot, currentAtOriginal, usedMagicPremises, restMagicPremises);
		console.log("is currentMagic Needed " + currentMagicIsNeeded);
		if (currentMagicIsNeeded) {
			//add new edge from the new conclusion to the current magic box
			newData.push(this.getNewEdge(currentAtOriginal.parent.data.target, treeRoot.data.target));

			treeRoot.parent.children.forEach(x => {
				if (!usedMagicPremises.includes(x)) {
					x.descendants().forEach(y => newData.push(y.data));
				}
			});

			newData.push(treeRoot.parent.data);
		} else {
			let conclusion = this._entireProofHierarchy.descendants().find(x => x.data.target.id === treeRoot.parent.data.target.id);
			if (!newData.includes(conclusion.data))
				newData.push(conclusion.data);

			conclusion.children.forEach(x => {
				//Add the entire relevant branch that already exist in the magical structure
				// (relevant as part of the new current premise)
				found = treeRoot.parent.children.find(y => y.data.source.id === x.data.source.id);
				if (found) {
					if (!newData.includes(x.data)) {
						newData.push(x.data);
					}
					found.children[0].descendants().forEach(y => {
						if (!newData.includes(y.data)) {
							newData.push(y.data);
						}
					})
				} else {
					//Add the branches that have some nodes which are not in the magical structures
					this.incAdd(x, treeRoot.parent, newData);
				}

			});
			//Add the nodes that are not affected by the removal of the magic rule
			treeRoot.parent.children
				.filter(x => x !== treeRoot)
				.forEach(x => {
					x.descendants()
						.filter(y => y !== x)
						.forEach(y => {
							if (!newData.includes(y.data))
								newData.push(y.data);
						});
				});
		}

		//add the rest of the proof
		mainRoot.descendants().forEach(x => {
			if (!treeRoot.parent.descendants().includes(x) && !newData.includes(x.data)) {
				newData.push(x.data);
			}
		});

		// if (newMagicBox) { proof.nodeInteracted = { id: newMagicBox.id, search: true } }
		proof.nodeInteracted = { id: treeRoot.data.target.id, search: true }
		
		this.updateAll(newData, "pullUp");
	}

	pushUp(treeRoot) {
		//when magic is not possible
		const magicImpossible = treeRoot.children == null || treeRoot.children[0].children == null || treeRoot.parent == null;
		if (proof.isDrawing || magicImpossible) {
			return;
		}

		let newData = [];
		let newMagicBox = this.getNewMagicBox();

		//connect the premises to the new magic box and add all their descendants
		treeRoot.children[0].children.forEach(x => {
			//don't add tautologies
			if (x.children[0].data.source.element !== "Asserted Conclusion" && !x.children[0].children) {
				return;
			}
			x.descendants().filter(y => x !== y).forEach(y => {
				newData.push(y.data);
			});
			newData.push(this.getNewEdge(x.data.source, newMagicBox));
		});

		treeRoot.parent.children.filter(x => x !== treeRoot).forEach(x => {
			if (x.children != null) {
				if (x.children[0].children != null) {
					x.children[0].children.forEach(y => {
						//don't add tautologies
						if (y.children[0].data.source.element !== "Asserted Conclusion" && !y.children[0].children) {
							return;
						}
						y.descendants().filter(z => z !== y).forEach(z => {
							newData.push(z.data);
						});
						newData.push(this.getNewEdge(y.data.source, newMagicBox));
					});
				} else if (x.children[0].data.source.element === "Asserted Conclusion") {
					x.children[0].descendants().forEach(y => newData.push(y.data));
					newData.push(this.getNewEdge(x.children[0].data.target, newMagicBox));

				}
			}
		})

		newData.push(this.getNewEdge(newMagicBox, treeRoot.parent.data.target));

		if (treeRoot.parent.parent != null) {
			this.addAllBut(treeRoot.parent.parent, newData);
		}

		proof.nodeInteracted = { id: newMagicBox.id, search: true };
		this.updateAll(newData, "pushUp");
	}

	pullDown(treeRoot) {
		//when magic is not possible
		const magicImpossible = treeRoot.children == null || treeRoot.children[0].data.source.type !== "mrule";
		if (proof.isDrawing || magicImpossible) {
			return;
		}

		let newData = [];
		//add all edges after the selected axiom, until the root is reached
		//addParents(treeRoot, newData);
		this.addAllBut(treeRoot, newData);

		let childrenOfMagic = treeRoot.children[0].children;
		let currentAtOriginal = this._entireProofHierarchy.descendants().find(x => x.data.source.id === treeRoot.data.source.id);
		let newMagicBox, relevantPremise, relevantPremiseCount, found;

		currentAtOriginal.children.forEach(child => {
			newData.push(child.data);//add the rule to axiom edge data
			child.children.forEach(grandChild => {
				newData.push(grandChild.data);//add the axiom to rule edge data

				//get the premise of the magic rule that corresponds to the current conclusion
				relevantPremise = [];
				relevantPremiseCount = 0;
				childrenOfMagic.forEach(x => {
					if (grandChild.descendants().filter(y => y !== grandChild).some(y => y.data.source.id === x.data.source.id)) {
						relevantPremise.push(x);
					}
				});

				//decide whether the relevant premise should be in a new magic rule or not
				//first, count how many axioms would not need a magic rule
				relevantPremiseCount = relevantPremise.length;

				if (grandChild.children != null) {
					if (grandChild.children[0].children != null) {
						grandChild.children[0].children.forEach(c => {
							if (relevantPremise.some(r => r.data.source.id === c.data.source.id)) {
								relevantPremiseCount--;
							}
						});
					} else {
						relevantPremiseCount--;
					}
				} else {
					relevantPremiseCount--;
				}
				//if the number of relevant axioms that need a magic rule is higher than 0, create a magic rule
				//otherwise, use the original rules
				if (relevantPremiseCount > 0) {
					newMagicBox = this.getNewMagicBox();
					relevantPremise.forEach(p => {
						newData.push(this.getNewEdge(p.data.source, newMagicBox));
						p.descendants().filter(x => x !== p).forEach(y => {
							newData.push(y.data);
						})
					});
					newData.push(this.getNewEdge(newMagicBox, grandChild.data.source));
				} else {
					//If there is no relevant premise, then it can be the case that the branch root is already a magic premise
					if (relevantPremise.length === 0) {
						console.assert(grandChild.children[0].data.source.type !== "mrule", "Must not be here!");
						found = childrenOfMagic.find(y => grandChild.data.source.id === y.data.source.id)
						if (found) {
							found.children[0].descendants().forEach(z => newData.push(z.data));
							return;
						}
					}
					//Otherwise, look for the relevant premise and keep its proof if found in the magical structure,
					// otherwise get it from the original proof structure
					newData.push(grandChild.children[0].data);
					if (grandChild.children[0].children) {
						grandChild.children[0].children.forEach(y => {
							console.log("looking for")
							console.log(y.data.source.element + " -> " + y.data.target.element)
							newData.push(y.data)
							found = treeRoot.descendants().find(z => z.data.source.id === y.data.source.id)
							if (found) {
								console.log("found")
								console.log(found.data.source.element + " -> " + found.data.target.element);
								found.children[0].descendants().forEach(z => newData.push(z.data));
							} else {
								console.log("not found")
								y.children[0].descendants().forEach(z => newData.push(z.data));
							}
						});
					}
				}
			})
		});

		// if (newMagicBox) { proof.nodeInteracted = { id: newMagicBox.id, search: true }; }
		proof.nodeInteracted = { id: treeRoot.children[0].data.source.id, search: true };
		
		this.updateAll(newData, "pullDown");
	}

	pushDown(treeRoot) {
		//when magic is not possible
		const magicImpossible = treeRoot.children == null || treeRoot.children[0].children == null || treeRoot.parent == null;

		if (proof.isDrawing || magicImpossible) {
			return;
		}

		let newData = [], newMagicBox = this.getNewMagicBox();
		
		//connect the children of the current axiom and all their descendants to the new magic box
		treeRoot.children[0].children.forEach(x => {
			//skip tautologies
			if (x.children[0].data.source.element !== "Asserted Conclusion" && !x.children[0].children) {
				return;
			}
			x.descendants().filter(y => x !== y).forEach(y => newData.push(y.data));
			newData.push(this.getNewEdge(x.data.source, newMagicBox));
		})

		treeRoot.parent.children
			.filter(premise => premise !== treeRoot)
			.forEach(premise => {
				//skip tautologies
				if (premise.children[0].data.source.element !== "Asserted Conclusion" && !premise.children[0].children) {
					return;
				}
				premise.descendants().filter(x => x !== premise).forEach(x => newData.push(x.data));
				newData.push(this.getNewEdge(premise.data.source, newMagicBox));
			});

		// treeRoot.parent.children.filter(x=>x!=treeRoot).forEach(x=>{
		// 	if(x.children != null){
		// 		if(x.children[0].children != null){
		// 			x.children[0].children.forEach(y=>{
		// 				//don't add tautologies
		// 				if(y.children[0].data.source.element!="Asserted Conclusion"){
		// 					if(!y.children[0].children)
		// 						return;
		// 				}
		// 				y.descendants().filter(z=>z!=y).forEach(z=>{
		// 					newData.push(z.data);
		// 				});
		// 				newData.push(this.getNewEdge(y.data.source,newMagicBox));
		// 			});
		// 		}
		// 		else if(x.children[0].data.source.element==="Asserted Conclusion"){
		// 			x.children[0].descendants().forEach(y=>newData.push(y.data));
		// 			newData.push(this.getNewEdge(x.children[0].data.target,newMagicBox));

		// 		}
		// 	}
		// })

		newData.push(this.getNewEdge(newMagicBox, treeRoot.parent.data.target));

		if (treeRoot.parent.parent != null) {
			this.addAllBut(treeRoot.parent.parent, newData);
		}

		proof.nodeInteracted = { id: newMagicBox.id, search: true };
		
		this.updateAll(newData, "pushDown");
	}

	//Add the data of all edges that will not be affected by the unraveling / creating of the current magic rule
	addAllBut(selectedObject, data) {
		let root = this.getRoot(selectedObject);
		let ignored = selectedObject.descendants().filter(x => x !== selectedObject);

		root.descendants().forEach(x => {
			if (ignored.some(y => x === y)) {
				return null;
			} else {
				data.push(x.data);
			}
		})

		return data;
	}

	//Return the top root of the stratified object
	getRoot(object) {
		let root = object;

		while (root.parent != null) {
			root = root.parent;
		}

		return root;
	}

	//Create a new edge with a fresh ID
	getNewEdge(sourceObject, TargetObject) {
		return {
			id: "MNE" + newEdgeIDCounter++,
			source: sourceObject,
			target: TargetObject,
			childrenIDs: [],
			element: ""
		};
	}

	//Create a new magic rule with a fresh ID
	getNewMagicBox() {
		return {
			id: "M" + newMagicBoxCounter++,
			element: "Magic Rule",
			type: "mrule"
		}
	}

	appendCircleAndText(group, text, tooltip, _class = '') {
		const { BTN_CIRCLE_SIZE } = nodeVisualsDefaults;
		group.append("circle")
			.attr("r", BTN_CIRCLE_SIZE / 2)
			.attr("cx", 0)
			.attr("cy", 0);
		group.append("text")
			.attr("class", `${_class} material-icons`)
			.attr("x", 0)
			.attr("y", 0)
			.text(text);
		group.append("title")
			.text(tooltip)
	}

	getMagic(root, actionName) {
		if (actionName === "pullDown" || actionName === "pushUp")
			return root.children[0];
		if (actionName === "pullUp" || actionName === "pushDown")
			return root.parent
	}

	orderStructure(data) {
		let orderedStructure = [];
		this.getDFOrder(data, data.find(x => x.id === "L-1"), orderedStructure);
		return orderedStructure;
	}

	getDFOrder(structure, currentRootData, orderedStructure) {
		orderedStructure.push(currentRootData);
		structure.forEach(d => {
			if (d.target.id === currentRootData.source.id) {
				this.getDFOrder(structure, d, orderedStructure);
			}
		});
	}

	incAdd(rootInOriginal, rootInCurrent, newData) {
		if (!newData.includes(rootInOriginal.data)) {
			newData.push(rootInOriginal.data)
		}

		if (rootInOriginal.children) {
			rootInOriginal.children.forEach(child => {
				if (!rootInCurrent.descendants().some(x => x.data.source.id === child.data.source.id)) {
					if (!this.isDerivableFromMagic(child, rootInCurrent, newData)) {
						this.incAdd(child, rootInCurrent, newData)
					}
				}
			})
		}
	}

	isDerivableFromMagic(child, rootInCurrent, newData) {
		let cDesc = child.descendants();
		let found;

		for (let i = 0; i < cDesc.length; i++) {
			found = rootInCurrent.descendants().find(x => cDesc[i].data.source.id === x.data.source.id);
			if (found) {
				//just to make sure it is derivable from this branch! this works because so far
				// the rest of the proof is not added yet to newData
				if (newData.some(x => found.data.source.id === x.source.id)) {
					return true;
				}
			}
		}
		return false;
	}
}
