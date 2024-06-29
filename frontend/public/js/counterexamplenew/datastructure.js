/**
 * This file handles all the related data structures for this project (except the selection data structure, this can be found in selection.js)
 */

import {SELECTION_NODES, SELECTION_TAGS} from "./selection.js";
import {SubstructureGraph} from "./substructures.js";
import {DRAW_MANAGER, tick} from "./draw.js";
import {TOOL_MANAGER, TOOL_TOGGLE_SHORTENING_MODE} from "./tools.js";

const NODE_NAME_NODE = "node";
const NODE_NAME_EDGE = "edge";

/**
 * Class representing a node inside the diagram
 */
class Node {

    /**
     *
     * @param {string}id id from result.model.xml
     * @param {string}element element from result.model.xml
     * @param {string}label label from result.model.xml
     */
    constructor(id, element, label) {
        this.id = id;
        this.element = element;
        if (label instanceof Array) {
            this.labels = label;
        } else {
            this.labels = label.replaceAll("[", "")
                .replaceAll("]", "")
                .replaceAll(" ", "")
                .replaceAll("\n", "")
                .split(",");
        }
        this.importantLabel = undefined;
        this.visible = true;
        this.group = undefined;
        this.expandedLabel = false;
        this.ignore = false;
        this.insideGroup = false;
        this.ignoreVisibility = false;
        this.indicateHiddenNode = false;
    }

    /**
     * get the id for the <g> element of this node
     * @returns {string}
     */
    getSVGGroupId() {
        return "svg_group_" + this.id;
    }

    /**
     * Determines the most important label of the list of labels
     * @param {string}importantLabel
     */
    updateImportantLabel(importantLabel) {
        let labelFound = this.checkIfImportantLabelMatchesWholeLabel(importantLabel);
        if (labelFound) {
            this.setImportantLabel(labelFound);
            return;
        }

        labelFound = this.checkIfImportantLabelContainsLabel(importantLabel);
        if (labelFound) {
            this.setImportantLabel(labelFound);
        }
    }

    /**
     * Checks if the node belongs to a group that is in collapsed state
     * @returns {boolean} Is the node inside a group?
     */
    isGrouped() {
        return this.group !== undefined;
    }

    /**
     * update the important concept for this node
     * @param {string}importantLabel new important concept
     */
    setImportantLabel(importantLabel) {
        this.importantLabel = importantLabel;
    }

    /**
     * Call this function to get a label to show inside a node
     * @returns {string}
     */
    getLabel() {
        let orderedLabel = this.importantLabel === undefined ? "" : this.importantLabel + "\n";
        for (let label of this.labels) {
            if (label === this.importantLabel) continue;
            orderedLabel += label + "\n";
        }
        return orderedLabel;
    }

    /**
     * checks if a concept is the important concept of a node
     * @param {string}label concept to check
     * @returns {boolean} is the concept the important concept?
     */
    isImportantLabel(label) {
        return this.importantLabel === label;
    }

    /**
     * Get a list of the concepts of this node in the correct order
     * @returns {string[]} list of the concepts in the correct order
     */
    getOrderedLabels() {
        let orderedLabels = [];
        if (DATA_STRUCTURE.debug) {
            orderedLabels.push(this.element);
        }
        for (let label of this.labels) {
            if (SELECTION_TAGS.isSelected(label)) {
                orderedLabels.push(label);
            }
        }

        if (this.importantLabel !== undefined && !orderedLabels.includes(this.importantLabel)) {
            orderedLabels.push(this.importantLabel);
        }

        for (let label of this.labels) {
            if (!orderedLabels.includes(label)) {
                orderedLabels.push(label);
            }
        }
        return orderedLabels;
    }

    /**
     * during the process of extracting the important label, if the mapped axiom is in category 1 (see Großer Beleg)
     * @param {string}importantLabel label to check
     * @returns {undefined|string}
     */
    checkIfImportantLabelMatchesWholeLabel(importantLabel) {
        for (let label of this.labels) {
            if (label === importantLabel) return label;
        }
        return undefined;
    }

    /**
     * during the process of extracting the important label, if the mapped axiom is in category 2 or 3 (see Großer Beleg)
     * @param {string}importantLabel label to check
     * @returns {undefined|string}
     */
    checkIfImportantLabelContainsLabel(importantLabel) {
        for (let label of this.labels) {
            if (importantLabel.includes(label)) return label;
        }
        return undefined;
    }

}

/**
 * Represents a collapsed group
 */
class GroupNode extends Node {
    /**
     *
     * @param {Group}group collapsed group that is going to be displayed as a node
     */
    constructor(group) {
        super("" + group.id, group.element, group.label);
    }
}

/**
 * class which is representing an edge of the graph
 */
class Edge {

    /**
     *
     * @param {Array<string>}label list of role names of this edge
     * @param {string|Node}source source of the edge
     * @param {string|Node}target target of the edge
     * @param {string}id id of the edge
     */
    constructor(label, source, target, id) {
        this.label = label;
        this.source = source;
        this.target = target;
        this.indicatesHiddenNode = false;
        this.id = id;
        this.lastTime = 0;
    }

    /**
     * Checks if this edge has the same {@link Edge#source} and {@link Edge#target} as another edge.
     * @param {Edge}edge Edge to compare with this edge.
     * @returns {boolean} true if they have the same {@link Edge#source} and {@link Edge#target}, otherwise false
     */
    sameDirection(edge) {
        return edge.source === this.source && edge.target === this.target;
    }

    /**
     * Combines all the role names of this edge and joins them with a line break for the tooltip
     * @returns {string}
     */
    getLabel() {
        return this.label.join("<br>");
    }

    /**
     * checks if this edge contains a specific role name
     * @param {string}label role name to check
     * @returns {boolean}
     */
    contains(label) {
        return this.label.includes(label);
    }

    /**
     * get the id for the <g> container representing the edge
     * @returns {string}
     */
    getSvgGroupID() {
        return "edge_" + this.id;
    }

    /**
     * Get the id of this edge for the number of the link inside the diagram
     * @param {number}linkNumber index of the highlighted role name that is currently drawn
     * @returns {string}
     */
    getLinkId(linkNumber) {
        return "edge_link_" + linkNumber;
    }

    /**
     * get the amount of lines that have to be drawn to represent these edges (for each highlighted role name we have to draw a new line)
     * @returns {number}
     */
    getAmountOfLinesToDraw() {
        let count = 0;
        for (let roleName of this.label) {
            if (SELECTION_TAGS.isSelected(roleName)) {
                count++;
            }
        }
        return count === 0 ? 1 : count;
    }

    /**
     * Get all role names of this edge that are highlighted
     * @returns {string[]}
     */
    getSelectedRoleNames() {
        let roleNames = [];
        for (let roleName of this.label) {
            if (SELECTION_TAGS.isSelected(roleName))
                roleNames.push(roleName);
        }
        return roleNames;
    }

}

/**
 * Represents an edge between a hidden group node and a node
 */
class GroupEdge extends Edge {
    /**
     *
     * @param {Array<string>}label {@link Edge#label}
     * @param {Node}source {@link Edge#source}
     * @param {Node}target {@link Edge#target}
     * @param {string}id {@link Edge#id}
     */
    constructor(label, source, target, id) {
        super(label, source, target, id);
    }
}

/**
 * Represents a Group
 */
class Group {

    /**
     *
     * @param {string}id of the group
     * @param {string}label label of the group
     * @param {Node[]}leaves child nodes/groups of this group
     * @param {number}number number of this group, ... to be completely honest ... I forgot why I added it and at this point I am to afraid to remove it
     */
    constructor(id, label, leaves, number) {
        this.id = id;
        this.label = label;
        this.leaves = [];
        this.groups = [];
        this.number = number;
        this.element = "g" + number;
        this.expanded = false;
        this.isChildren = false;
        for (let leaf of leaves) {
            if (leaf instanceof Group) {
                this.groups.push(leaf);
            }
            if (leaf instanceof Node) {
                this.leaves.push(leaf);
            }
        }
    }

    /**
     * get the id that the <g> element of the group will get
     * @returns {string}
     */
    getSvgGroupId() {
        return "group_g_" + this.id;
    }

}

/**
 * represents a 2-dimensional point
 */
class DataPoint {
    /**
     *
     * @param {number}x
     * @param {number}y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

/**
 * Represents a range of numbers from a {@link Range#min} and a {@link Range#max}
 */
class Range {

    constructor() {
        this.min = Number.MAX_SAFE_INTEGER;
        this.max = Number.MIN_SAFE_INTEGER;
    }

    /**
     * Add a new value to the list and adjust the extreme values of this range
     * @param {number}value value to be added to this range
     */
    update(value) {
        if (value < this.min) this.min = value;
        if (value > this.max) this.max = value;
    }

    /**
     * Gets the actual range value of this range
     * @returns {number} {@link Range#max} - {@link Range#min}
     */
    length() {
        return Math.abs(this.max - this.min);
    }

    /**
     *
     * @param value
     * @returns {boolean}
     */
    isInside(value) {
        return value >= this.min && value <= this.max;
    }


}

/**
 * Represents a rectangular area based on two points
 */
class Area {

    /**
     *
     * @param {DataPoint}point1 First corner of the area
     * @param {DataPoint}point2 Second corner of the area
     */
    constructor(point1, point2) {
        this.x = new Range();
        this.y = new Range();
        this.x.update(point1.x);
        this.x.update(point2.x);
        this.y.update(point1.y);
        this.y.update(point2.y);
    }

    /**
     * Checks if a point is inside the area
     * @param {Node, DataPoint}point point to check if it is inside the area
     * @returns {boolean} is the point inside the area?
     */
    isInside(point) {
        return this.x.isInside(point.x) && this.y.isInside(point.y)
    }
}

/**
 * Represents the data structure of a model. (a graph) It has a list of nodes, a list of edges and a list of groups
 */
class Snapshot {

    constructor() {
        this.nodes = [];
        this.edges = [];
        this.groups = [];
        this.edgesWithNodeObject = [];
        this.calculateEdgesWithNodeObjects();
        this.searchGraph = undefined;
    }

    /**
     * Add a node, an edge or a group to the data set
     * @param {Edge|Node|Group} object to be added
     */
    add(object) {
        if (object instanceof Node) {
            this.nodes.push(object);
            return;
        }

        if (object instanceof Edge) {
            if (object.source instanceof Node) {
                this.edgesWithNodeObject.push(object);
                return;
            }
            this.edges.push(object);
            return;
        }

        if (object instanceof Group) {
            for (let group of object.groups) {
                this.remove(group);
            }
            this.groups.push(object);
            return;
        }

        throw "You can only add objects of type Node, Group or Edge!";
    }

    /**
     * Remove a node, an edge or a group from the data set
     * @param {Edge|Node|Group}object to be removed
     */
    remove(object) {

        if (object instanceof Edge) {
            this.edges.removeObject(object);
        }
        if (object instanceof Node) {
            this.nodes.removeObject(object);
        }
        if (object instanceof Group) {
            this.groups.removeObject(object);
            let index = 0;
            for (let group of this.groups) {
                if (group.id === object.id) {
                    this.groups.splice(index, 1);
                    break;
                }
                index++;
            }
        }
    }

    /**
     * Build a search graph for this snapshot to find all reachable nodes
     */
    buildSearchGraph() {
        this.searchGraph = new SearchGraph(this);
    }

    /**
     * Replace the {@link Edge#source} and {@link Edge#target} attributes with the actual node objects
     */
    calculateEdgesWithNodeObjects() {
        this.edgesWithNodeObject = [];
        for (let edge of this.edges) {
            let source, target;
            for (let node of this.nodes) {
                if (node.id === edge.target) {
                    target = node;
                }
                if (node.id === edge.source) {
                    source = node;
                }
                if (source !== undefined && target !== undefined) break;
            }

            let newEdge;
            if (edge instanceof GroupEdge) {
                newEdge = new GroupEdge(edge.label, source, target, edge.id);
            } else {
                newEdge = new Edge(edge.label, source, target, edge.id);
            }
            this.edgesWithNodeObject.push(newEdge);
        }
    }

    /**
     * Unite edges with the same direction and {@link Edge#source} and {@link Edge#target} node
     */
    fixEdges() {
        let fixedEdges = [];
        while (this.edges.length > 0) {
            let edge = this.edges[0];
            for (let i = this.edges.length - 1; i >= 0; i--) {
                let secondEdge = this.edges[i];
                // console.log(secondEdge)
                if (secondEdge.id === edge.id) continue;
                if (secondEdge.sameDirection(edge)) {
                    edge.label = edge.label.concat(secondEdge.label);
                    this.edges.removeObject(secondEdge);
                }
            }
            this.edges.removeObject(edge);
            fixedEdges.push(edge);
        }
        this.edges = fixedEdges;
    }

}

/**
 * Main Data structure of the project. Here the imported data, meta data and other information are stored
 */
class DataStructure {

    constructor() {
        // list of all unique labels of the model
        this.allLabels = [];
        // max number of concepts within a node
        this.maxAmountOfLabelsPerNode = 0;
        // current id to generate new ids
        this.currentId = 0;
        // mapping of representative axiom
        this.mapper = undefined;
        // original model data in from a Snapshot
        this.originalData = undefined;
        // amount of groups
        this.groupCount = 0;
        this.currentEdgeId = 0;
        this.nodesPosition = {}
        // flag to show hidden nodes
        this.showHiddenNodes = false;
        // flag to show shortening mode
        this.shorteningMode = false;
        // amount of concepts that are visible in the shortening mode
        this.shorteningCount = 3;
        // debug mode
        this.debug = false;
        this.substructureGraph = undefined;
    }

    /**
     * Import the generated data
     * @param {JSON}mapper mapper.json
     * @param {XMLDocument}model result.model.xml
     */
    importData(mapper, model) {

        this.mapper = mapper["Concept2Representative"];
        this.originalData = this.convertXML2Json(model);
        this.originalData.fixEdges();
        this.originalData.calculateEdgesWithNodeObjects();
        this.originalData.buildSearchGraph();
        this.generateMetaData();
        this.setImportantLabels();
        this.substructureGraph = new SubstructureGraph(this.originalData);
        this.substructures = this.substructureGraph.buildSubstructures(this.mapper);
        // console.log(this.substructures);
        // console.log(this.mapper);
    }

    /**
     * Search all unique labels that contain a entered text
     * @param {string}sublabel the entered text
     * @returns {string[]} list of all unique labels
     */
    searchForLabels(sublabel) {
        sublabel = sublabel.toLowerCase();
        let result = [];
        for (let label of this.allLabels) {
            if (label.toLowerCase().includes(sublabel)) {
                result.push(label);
            }
        }
        return result;
    }

    /**
     * extract the important labels from mapper.json
     */
    setImportantLabels() {
        for (let label in this.mapper) {
            let element = this.mapper[label];
            for (let node of this.originalData.nodes) {
                if (node.element === element) {
                    node.updateImportantLabel(label);
                    break;
                }
            }
        }
    }

    /**
     * generate meta data for this data structure
     */
    generateMetaData() {
        this.allLabels = [];
        for (let node of this.originalData.nodes) {
            this.currentId = Math.max(this.currentId, node.id);
            this.maxAmountOfLabelsPerNode = Math.max(this.maxAmountOfLabelsPerNode, node.labels.length);
            for (let label of node.labels) {
                this.allLabels.pushIfNotExist(label);
            }
        }

        for (let edge of this.originalData.edges) {
            for (let label of edge.label) {
                this.allLabels.pushIfNotExist(label);
            }
        }

        document.getElementById("shortening_mode_value").max = this.maxAmountOfLabelsPerNode;
        if (document.getElementById("shortening_mode_value").value > this.maxAmountOfLabelsPerNode) {
            document.getElementById("shortening_mode_value").value = this.maxAmountOfLabelsPerNode;

        }

        this.shorteningCount = document.getElementById("shortening_mode_value").value;

        let _ref = this;
        document.getElementById("shortening_mode_value").oninput = function () {
            _ref.shorteningCount = this.value;
            DRAW_MANAGER.labelNodes();
            tick();
        }

        document.getElementById("shortening_mode").oninput = function () {
            TOOL_MANAGER.execute(TOOL_TOGGLE_SHORTENING_MODE);
        }

        document.getElementById("open_toolbar").onclick = function () {
            document.getElementById("toolbar").style.display = "block"
            document.getElementById("open_toolbar").style.display = "none"
        }

        document.getElementById("close_toolbar").onclick = function () {
            document.getElementById("toolbar").style.display = "none"
            document.getElementById("open_toolbar").style.display = "inline-block"
        }
    }

    /**
     * Convert the XML model to a JSON model
     * @param {XMLDocument}model model to be converted
     * @returns {Snapshot} resulting model in the internal data structure
     */
    convertXML2Json(model) {
        let graph = model.getElementsByTagName("graph");
        if (graph.length === 0) throw "Illegal state: No xml element with tag name 'graph'";

        let snapshot = new Snapshot();

        graph = graph[0];
        for (let child of graph.childNodes) {

            let object;
            switch (child.nodeName) {
                case NODE_NAME_EDGE:
                    object = this.buildEdge(child);
                    break;
                case NODE_NAME_NODE:
                    object = this.buildNode(child);
                    break;
                default:
                    continue;
            }
            snapshot.add(object);
        }

        return snapshot;
    }

    /**
     * Creates an instance of {@link Node} based on a given xml object
     * @param {object}xml xml object to read the data from to create the node object
     * @returns {Node} node object that was created
     */
    buildNode(xml) {
        let id = xml.getAttribute("id");
        let label = undefined, element = undefined;

        for (let data of xml.getElementsByTagName("data")) {
            let key = data.attributes["key"].nodeValue;
            if (key === "element") {
                element = data.innerHTML
            } else {
                label = data.innerHTML;
            }
        }
        return new Node(id, element, label);
    }

    /**
     * Creates an instance of {@link Edge} based on a given xml object
     * @param {object}xml xml object to read the data from to create the edge object
     * @returns {Edge} edge object that was created
     */
    buildEdge(xml) {
        let source = xml.getAttribute("source");
        let label = xml.getElementsByTagName("data")[0].innerHTML;
        let target = xml.getAttribute("target");
        this.currentEdgeId++;
        return new Edge([label], source, target, this.currentEdgeId);
    }

    /**
     * Build a new group based on the current selection
     * @param {string}name name of the new group
     * @returns {Group}
     */
    buildGroup(name) {
        this.groupCount++;
        this.currentId++;

        let selectedObjects = this.getSelectedObjects();
        return new Group(this.currentId, this.getGroupName(name), selectedObjects, this.groupCount);
    }

    /**
     * Toggle the state of a group
     * @param {string}element {@link Group#element}
     */
    toggleVisibilityOfGroup(element) {
        for (let group of this.originalData.groups) {
            if (group.groups.length > 0) {
                this.toggleVisibilityOfGroupLeaves(group, element)
            }
            if (group.element === element) {
                group.expanded = !group.expanded;
            }
        }
    }

    /**
     * Toggle the visibility of groups within a expanded group
     * @param {Group}group collapsed group
     * @param {string}element {@link Group#expanded}
     */
    toggleVisibilityOfGroupLeaves(group, element) {
        for (let child of group.groups) {
            if (child.groups.length > 0) {
                this.toggleVisibilityOfGroupLeaves(child, element)
            }
            if (child.element === element) {
                child.expanded = !child.expanded;
            }
        }
    }

    /**
     * Generate unique group name
     * @param {string}name entered name of the user
     * @returns {string}
     */
    getGroupName(name) {
        let listOfAllNames = [];
        for (let group of this.originalData.groups) {
            listOfAllNames.push(group.label);
        }
        if (!listOfAllNames.includes(name)) return name;

        let count = 1;
        let newName = name;
        do {
            newName = name + count;
            count++;
        } while (listOfAllNames.includes(newName))
        return newName;

    }

    /**
     * The actual node object of the current selected nodes
     * @returns {Node[]}
     */
    getSelectedObjects() {
        let selectedNodes = [];
        for (let node of this.originalData.nodes) {
            if (SELECTION_NODES.isSelected(node.element)) {
                selectedNodes.push(node);
            }
        }
        for (let group of this.originalData.groups) {
            if (SELECTION_NODES.isSelected(group.element)) {
                selectedNodes.push(group);
            }
        }
        return selectedNodes;
    }

    /**
     * Get all invisible nodes. (Nodes without the {@link Node#visible})
     * @returns {Node[]} Nodes without the {@link Node#visible}
     */
    getInvisibleNodes() {
        let invisibleNodes = [];
        for (let node of this.originalData.nodes) {
            if (!node.visible) invisibleNodes.push(node.element);
        }
        return invisibleNodes;
    }

    /**
     * Build a "sub"-snapshot based on the flags of the original data set
     * @returns {Snapshot}
     */
    buildSnapshot() {
        let snapshot = new Snapshot();

        for (let node of this.originalData.nodes) {
            node.groupId = undefined;
            node.ignore = false;
            node.indicateHiddenNode = false;
            node.insideGroup = false;
        }

        for (let group of this.originalData.groups) {
            this.buildGroupFromParent(undefined, group, snapshot);
        }

        for (let node of this.originalData.nodes) {
            if (node.groupId !== undefined) continue;
            if (!node.visible && !this.showHiddenNodes) {
                if (!node.ignoreVisibility) {
                    node.ignore = true;
                    continue;
                }
            }
            snapshot.add(node);
        }

        for (let edge of this.originalData.edgesWithNodeObject) {
            if (edge.source.groupId !== undefined && edge.target.groupId !== undefined) {
                continue;
            }
            if (edge.source.groupId !== undefined && edge.target.groupId === undefined) {
                if (edge.target.ignore) continue;
                this.currentEdgeId++;
                snapshot.add(new GroupEdge([], edge.source.groupId, edge.target.id, this.currentEdgeId));

            }
            if (edge.source.groupId === undefined && edge.target.groupId !== undefined) {
                if (edge.source.ignore) continue;
                this.currentEdgeId++;
                snapshot.add(new GroupEdge([], edge.source.id, edge.target.groupId, this.currentEdgeId));
            }
            if (edge.source.groupId === undefined && edge.target.groupId === undefined) {
                if (edge.source.ignore && edge.target.ignore) {
                    continue;
                }
                if (edge.source.ignore && !edge.target.ignore) {
                    edge.target.indicateHiddenNode = true;
                    continue;
                }
                if (!edge.source.ignore && edge.target.ignore) {
                    edge.source.indicateHiddenNode = true;
                    continue;
                }
                if (!edge.source.ignore && !edge.target.ignore) {
                    snapshot.add(this.getEdgeById(edge.id));
                }
            }
        }

        snapshot.fixEdges();
        snapshot.calculateEdgesWithNodeObjects();
        snapshot.buildSearchGraph();

        return snapshot;
    }

    /**
     * Recursive adding of groups to the snapshot
     * @param {Group}parent parent group
     * @param {Group}group current group
     * @param {Snapshot}snapshot current Snapshot
     */
    buildGroupFromParent(parent, group, snapshot) {
        if (group.expanded) {
            let newGroup = new Group(group.id, group.label, group.leaves, group.number);
            snapshot.add(newGroup);
            if (parent !== undefined)
                parent.groups.push(newGroup);
            for (let leave of newGroup.leaves) {
                leave.insideGroup = true;
            }
            for (let childGroup of group.groups) {
                this.buildGroupFromParent(newGroup, childGroup, snapshot);
            }
        }

        if (!group.expanded) {
            let children = this.getChildren(group, []);
            for (let child of children) {
                child.groupId = "" + group.id;
            }
            let groupNode = new GroupNode(group);
            if (parent !== undefined)
                parent.leaves.push(groupNode);
            snapshot.add(groupNode);
        }
    }

    /**
     * recursively get all children of a group
     * @param {Group}parentGroup parent group
     * @param {Node[]}currentList list of all children
     * @returns {Node[]}
     */
    getChildren(parentGroup, currentList) {
        for (let leave of parentGroup.leaves) {
            currentList.push(leave);
        }
        for (let group of parentGroup.groups) {
            this.getChildren(group, currentList);
        }
        return currentList;
    }

    /**
     * Get an edge by id
     * @param {string}id {@link Edge#id}
     * @returns {undefined|Edge}
     */
    getEdgeById(id) {
        for (let edge of this.originalData.edges) {
            if (edge.id === id) return edge;
        }
        return undefined;
    }

    /**
     * Toggle the visibility of a given list of nodes
     * @param {string[]}listOfNodes given list of nodes {@link Node#element}
     * @param {boolean}visible shall these nodes be visible or not
     */
    toggleVisibility(listOfNodes, visible) {
        for (let node of this.originalData.nodes) {
            if (listOfNodes.includes(node.element)) {
                node.visible = visible;
            }
        }
    }

}

/**
 * Represents a node inside the {@link SearchGraph}
 */
class SearchGraphNode {
    /**
     *
     * @param {string}element element id of the node {@link Node#element}
     * @param {boolean}visible visible flag of the node {@link Node#visible}
     */
    constructor(element, visible) {
        this.element = element;
        this.visible = visible;
        this.children = []
    }

}

/**
 * Class for a search graph to find reachable hidden nodes from a given starting {@link SearchGraphNode}
 */
class SearchGraph {

    /**
     * @param {Snapshot}snapshot snapshot to generate the graph from
     */
    constructor(snapshot) {
        this.nodes = {};
        this.buildGraph(snapshot);
    }

    /**
     * build the graph
     * @param {Snapshot}snapshot
     */
    buildGraph(snapshot) {
        for (let node of snapshot.nodes) {
            this.nodes[node.element] = new SearchGraphNode(node.element, node.visible);
        }

        for (let node of DATA_STRUCTURE.originalData.nodes) {
            if (node.ignore) {
                this.nodes[node.element] = new SearchGraphNode(node.element, node.visible);
            }
        }

        for (let edge of snapshot.edgesWithNodeObject) {
            this.nodes[edge.source.element].children.push(this.nodes[edge.target.element]);
            this.nodes[edge.target.element].children.push(this.nodes[edge.source.element]);
        }

        for (let edge of DATA_STRUCTURE.originalData.edgesWithNodeObject) {
            if (this.nodes[edge.source.element] === undefined || this.nodes[edge.target.element] === undefined)
                continue;
            if (edge.source.ignore || edge.target.ignore) {
                this.nodes[edge.source.element].children.push(this.nodes[edge.target.element]);
                this.nodes[edge.target.element].children.push(this.nodes[edge.source.element]);
            }
        }

    }

    /**
     * Searches all the hidden that can be reached from the node with the {@link SearchGraphNode#element}
     * @param {string}element Starting node
     * @returns {string[]} list of reachable hidden nodes
     */
    searchReachableHiddenNodes(element) {
        let foundNodes = [];
        let nodesToCheck = [element];
        let checkedNodes = [];
        while (nodesToCheck.length > 0) {
            let searchElement = nodesToCheck.pop();
            checkedNodes.push(searchElement);
            for (let child of this.nodes[searchElement].children) {
                if (!child.visible) {
                    foundNodes.push(child.element);
                    if (!checkedNodes.includes(child.element)) {
                        nodesToCheck.push(child.element);
                    }
                }
            }

        }
        return foundNodes;
    }


}

/**
 * Singleton instance of the main data structure
 * @type {DataStructure}
 */
const DATA_STRUCTURE = new DataStructure();

export {DATA_STRUCTURE, GroupNode, DataPoint, GroupEdge, Node, Area, Snapshot, Edge, Group};