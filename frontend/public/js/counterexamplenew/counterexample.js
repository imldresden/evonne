import {readFiles} from "./fileReader.js";
import { globals } from "../shared-data.js";
import { colors, stylesheet } from "../../../style/counter-cy-style.js";
import { counter } from "../layouts/cola.js";
import {DATA_STRUCTURE} from "./datastructure.js";
import { grouping } from "./grouping.js";
import {activateKeyPressListener} from "./shortcuts.js";
import thumbnailViewer from "../utils/pan-zoom.js";
import {initializeSearchBar} from "./tags.js";
import {DRAW_MANAGER} from "./draw.js";

let cy;
const ontologyNodeId = "oN";
let removed;
let originalEdgeData = [];
Array.prototype.removeObject = function (object) {
    let index = this.indexOf(object);
    if (index > -1) {
        this.splice(index, 1);
    }
}

Array.prototype.copy = function () {
    let copy = [];
    for (let content of this) {
        copy.push(content);
    }
    return copy;
}

Array.prototype.pushIfNotExist = function (object) {
    if (this.includes(object)) return;
    this.push(object);
}

await readFiles();

async function createContent(mapper, model) {
    const existingSVG = document.getElementById('counter-view');
    if (existingSVG) {
      existingSVG.remove();
    }
    const svg = document.createElement('svg');
    svg.id = 'counter-view';
    document.getElementById('counter-example-container').append(svg);
  
    const container = document.getElementById("counter-view");
    container.innerHTML = "";
  
    const elements = processData(mapper, model);
    cy = cytoscape({
      container,
      style: stylesheet,
      layout: counter,
      wheelSensitivity: 0.3,
      ready: function () {    
        var api = this.expandCollapse({        
          fisheye: true,
          animate: true,
          undoable: false,
          expandCollapseCuePosition: setCuePosition,
          expandCueImage: "../icons/icon-plus.svg",
          collapseCueImage: "../icons/icon-minus.svg"
        });
        cy.nodes().on("expandcollapse.afterexpand", function (e) {
          api.setOption("expandCollapseCuePosition", setCuePosition);
        });
        function setCuePosition(e) {
          const { x1, y1 } = e._private.bodyBounds;        
          const margin = 2;
          const x = x1 + margin;
          const y = y1 + margin;
          return { x, y };
        }
        api.collapseAll();
      }
    }).on('cxttap', function(event) {

      const contextNode = event.target || event.cyTarget;
      const selectedElems = cy.nodes(':selected').union(contextNode);
      let isGroupSelected = false;
    
      selectedElems.forEach(node => {
        if (node.isParent() || node.parent().isParent()) {
          isGroupSelected = true;
        }
      });
    
      if (isGroupSelected) {
        contextMenu.showMenuItem('remove-compound');
      } else {
        contextMenu.hideMenuItem('remove-compound');
      }
      if (allSelected('node')) {
        contextMenu.hideMenuItem('select-all-nodes');
        contextMenu.showMenuItem('unselect-all-nodes');
      }
      else {
        contextMenu.hideMenuItem('unselect-all-nodes');
        contextMenu.showMenuItem('select-all-nodes');
      }
      const hiddenNodesExist = cy.nodes(':hidden').length > 0;
      if (hiddenNodesExist) {
        contextMenu.showMenuItem('show-hidden-nodes');
      } else {
        contextMenu.hideMenuItem('show-hidden-nodes');
      }
    });
    document.getElementById('lasso_selection').addEventListener('click', function() {
      cy.lassoSelectionEnabled(true);
    });
    
    document.getElementById('clear_selection').addEventListener('click', function() {
      cy.nodes().unselect();
    });

    document.getElementById('shortening_mode_value').addEventListener('input', function(){
      // Check if the checkbox is checked
      UpdateNodeslabel();
      // Now you can use the isChecked variable to perform actions based on whether the checkbox is checked or not
    });

    document.getElementById('shortening_mode').addEventListener('click', function(){
      // Check if the checkbox is checked
      UpdateNodeslabel();
      // Now you can use the isChecked variable to perform actions based on whether the checkbox is checked or not
    });
    document.getElementById('edge_labels').addEventListener('click', function(){
      const showLabels = document.getElementById('edge_labels').checked;
    
      cy.edges().forEach(edge => {
        edge.style({
          'label': showLabels ? edge.data('truncatedLabel') : ''
        });
      });
    });
    document.getElementById('edge_bundle').addEventListener('click', function(){
      const edgeData = cy.edges().map(edge => {
        return {
          data: {
            id: edge.id(),
            source: edge.data('source'),
            target: edge.data('target'),
            label: edge.data('label'),
            count: edge.data('count') || 1,
            width: edge.data('width') || 1
          }
        };
      });
    
      // Apply the edge bundling logic
      const updatedEdges = bundleEdges(edgeData);
      cy.edges().remove();
      // Update the Cytoscape edges
      updatedEdges.forEach(edge => {
        let cyEdge = cy.getElementById(edge.data.id);
        if (cyEdge.length) {
          cyEdge.data(edge.data);
        } else {
          cy.add({
            group: 'edges',
            data: edge.data
          });
        }
      });
      initializeEdgeLabels();
      // Run the layout to refresh the view
      cy.layout(cy.counter).run();
    });

    function disableLassoSelection() {
      cy.lassoSelectionEnabled(false);
    }
    
    document.getElementById('rectangle_selection').addEventListener('click', disableLassoSelection);
    document.getElementById('normal_selection').addEventListener('click', disableLassoSelection);
    document.getElementById('hide').addEventListener('click', hideNodes);
    document.getElementById('show_hidden_nodes').addEventListener('click', showHiddenNodes);

    var allSelected = function (type) {
      if (type == 'node') {
        return cy.nodes().length == cy.nodes(':selected').length;
      }
      else if (type == 'edge') {
        return cy.edges().length == cy.edges(':selected').length;
      }
      return false;
    }

    var selectAllOfTheSameType = function (type) {
      if (type == 'node') {
        cy.nodes().select();
      } else if (type == 'edge') {
        cy.edges().select();
      }
    };
    var unselectAllOfTheSameType = function (type) {
      if (type == 'node') {
        cy.nodes().unselect();
        ;
      } else if (type == 'edge') {
        cy.edges().unselect();
      }
    };

   var contextMenu = cy.contextMenus({
        menuItems: [
          {
            id: 'group-nodes',
            content: 'Group Nodes',
            tooltipText: 'Group selected nodes',
            selector: 'node',
            coreAsWell: false,
            onClickFunction: function (event) {
              const contextNode = event.target || event.cyTarget;
              const selectedElems = cy.nodes(':selected').union(contextNode);
          
              if (selectedElems.length < 1) {
                return;
              }
          
              const parentNodes = selectedElems.parents();
              const uniqueParentNodes = new Set(parentNodes.map(node => node.id()));
          
              if (uniqueParentNodes.size > 1 || (uniqueParentNodes.size === 1 && selectedElems.not(':parent').length > 0)) {
                const id = new Date().getTime();
                const groupName = prompt("Enter group name:", "Group") || "Group";
                const groupId = addParentNode(id, null, groupName);
                
                selectedElems.forEach(elem => {
                  elem.move({ parent: groupId });
                });
              } else {
                const groupNode = selectedElems.filter(':parent');
                const nonGroupNodes = selectedElems.not(':parent');
          
                if (groupNode.length > 0 && nonGroupNodes.length > 0) {
                  // If both a group node and other nodes are selected, add the nodes to the group
                  const groupId = groupNode[0].id();
                  nonGroupNodes.move({ parent: groupId });
                } else {
                  // Create a new group
                  const parent = selectedElems[0].parent().id();
                  const id = new Date().getTime();
                  const groupName = prompt("Enter group name:", "Group") || "Group";
                  const groupId = addParentNode(id, parent, groupName);
                  selectedElems.forEach(elem => {
                    elem.move({ parent: groupId });
                  });
                }
              }
            }
          },
          {
            id: 'edit-group-name',
            content: 'Edit Group Name',
            tooltipText: 'Edit name of selected group',
            selector: 'node:parent',
            coreAsWell: false,
            onClickFunction: function (event) {
              const contextNode = event.target || event.cyTarget;
              const selectedGroup = cy.nodes(':selected').filter(':parent').union(contextNode);
          
              if (selectedGroup.length === 1) {
                const currentName = selectedGroup.data('labels');
                console.log('Current group name:', currentName);
          
                const newName = prompt("Enter new group name:", currentName) || currentName;
                selectedGroup.data('labels', newName);
          
                // Recalculate dimensions if necessary
                const labelHeight = 30; // Space for the label at the top
                const boxH = calcGroupHeight(newName) + labelHeight;
                const boxW = calcBoxWidth(newName.length);
          
                // Update node dimensions and styles
                selectedGroup.data('boxH', boxH);
                selectedGroup.data('boxW', boxW);
          
                cy.style()
                  .selector('#' + selectedGroup.id())
                  .style({
                    'content': newName,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'font-size': '14px',
                    'color': '#000',
                    'text-margin-y': -labelHeight / -1.2,
                    'width': boxW,
                    'height': boxH,
                  })
                  .update();
              }
            }
          },
          {
            id: 'remove-compound',
            content: 'Ungroup Node(s)',
            tooltipText: 'Remove selected nodes from group',
            selector: 'node',
            coreAsWell: false,
            show: function (ele) {
              const selectedElems = ele ? ele : cy.nodes(':selected');
              console.log(selectedElems);
              // Check if any of the selected elements are parents (groups) or have parents that are groups
              const hasGroups = selectedElems.some(node => node.isParent() || node.parent().isParent());
          
              return hasGroups;
            },
            onClickFunction: function (event) {
              const contextNode = event.target || event.cyTarget;
              const selectedElems = cy.nodes(':selected').union(contextNode);
          
              if (selectedElems.length < 1) {
                return;
              }
          
              selectedElems.forEach(node => {
                if (node.isParent()) {
                  // Ungroup all child nodes
                  node.children().move({ parent: null });
                  cy.remove(node);
                } else {
                  const parent = node.parent();
                  if (parent.isParent()) {
                    node.move({ parent: null });
          
                    // Check if parent has become empty and remove it if so
                    if (parent.children().length === 0) {
                      cy.remove(parent);
                    }
                  }
                }
              });
            }
          },
          {
            id: 'hide-nodes',
            content: 'Hide Node(s)',
            tooltipText: 'Hide selected nodes',
            selector: 'node',
            coreAsWell: false,
            onClickFunction: function (event) {
              const contextNode = event.target || event.cyTarget;
              hideNodes(contextNode);
            }
          },
          {
            id: 'show-hidden-nodes',
            content: 'Show Hidden Nodes',
            tooltipText: 'Show all hidden nodes',
            selector: 'node',
            coreAsWell: true,
            show: function () {
              // Only show this menu item if there are hidden nodes
              return cy.nodes(':hidden').length > 0;
            },
            onClickFunction: function () {
              showAllHiddenNodes();
            }
          },
          // {
          //   id: 'remove',
          //   content: 'remove',
          //   tooltipText: 'remove',
          //   image: {src: "../icons/remove.svg", width: 12, height: 12, x: 6, y: 4},
          //   selector: 'node, edge',
          //   onClickFunction: function (event) {
          //     var target = event.target || event.cyTarget;
          //     removed = target.remove();
          //     console.log(removed);
          //     contextMenu.showMenuItem('undo-last-remove');
          //   },
          //   hasTrailingDivider: true
          // },
          // {
          //   id: 'undo-last-remove',
          //   content: 'undo last remove',
          //   selector: 'node, edge',
          //   show: false,
          //   coreAsWell: false,
          //   onClickFunction: function (event) {
          //     if (removed) {
          //       removed.restore();
          //     }
          //     contextMenu.hideMenuItem('undo-last-remove');
          //   },
          //   hasTrailingDivider: true
          // },
          
          {
            id: 'select-all-nodes',
            content: 'select all nodes',
            selector: 'node',
            coreAsWell: false,
            show: true,
            onClickFunction: function (event) {
              selectAllOfTheSameType('node');

              contextMenu.hideMenuItem('select-all-nodes');
              contextMenu.showMenuItem('unselect-all-nodes');
            }
          },
          {
            id: 'unselect-all-nodes',
            content: 'unselect all nodes',
            selector: 'node',
            coreAsWell: false,
            show: false,
            onClickFunction: function (event) {
              unselectAllOfTheSameType('node');

              contextMenu.showMenuItem('select-all-nodes');
              contextMenu.hideMenuItem('unselect-all-nodes');
            }
          },
        ],
        menuItemClasses: ['custom-menu-item'],
        contextMenuClasses: ['custom-context-menu'],
        submenuIndicator: { src: '../icons/submenu-indicator-default.svg', width: 12, height: 12 }
      });
    // console.log(instance.isActive());
    function removeHtmlLabels(nodes) {
      nodes.forEach(node => {
        const htmlElement = document.getElementById(ontologyNodeId + node.id());
        if (htmlElement && htmlElement.parentNode) {
          htmlElement.parentNode.remove();
        }
      });
    }

   // function showHiddenNodes() {
    //   const hiddenNodes = cy.nodes(':hidden');
    //   hiddenNodes.show();
    //   cy.edges(':hidden').show();
    
    //   hiddenNodes.addClass('ghost-node');
    
    //   // Clear hiddenNeighbors data for all nodes
    //   cy.nodes().forEach(node => {
    //     node.data('hiddenNeighbors', []);
    //   });
    
    //   updateIndicators();
    // }

    function hideNodes(contextNode) {
      const selectedNodes = cy.nodes(':selected').not(':parent, [parent]').union(contextNode);
      if (selectedNodes.length === 0) {
        return;
      }
      removeHtmlLabels(selectedNodes);
    
      const hiddenNodeIds = new Set(); // Use a Set to collect the IDs of all hidden nodes
    
      // Mark selected nodes as hidden and collect their IDs
      selectedNodes.forEach(node => {
        node.hide();
        hiddenNodeIds.add(node.id());
      });
    
      // Update hiddenNeighbors data for all nodes
      cy.nodes().forEach(node => {
        if (!node.hasClass('group')) {
          const connectedNodes = node.neighborhood().nodes();
          connectedNodes.forEach(neighbor => {
            if (!neighbor.hasClass('group') && hiddenNodeIds.has(neighbor.id())) {
              if (!node.data('hiddenNeighbors')) {
                node.data('hiddenNeighbors', []);
              }
              const hiddenNeighbors = node.data('hiddenNeighbors');
              if (!hiddenNeighbors.includes(neighbor.id())) {
                hiddenNeighbors.push(neighbor.id());
              }
            }
          });
        }
      });
    
      updateIndicators();
    }
    
    
    
    
    // function hideNode(hiddenNodeId) {
    //   const hiddenNode = cy.$(`#${hiddenNodeId}`);
    //   if (!hiddenNode.hidden()) {
    //     hiddenNode.hide();
    //     hiddenNode.connectedEdges().hide();
    //     hiddenNode.addClass('ghost-node');
    
    //     // Add this node to the hiddenNeighbors list of all its neighbors
    //     hiddenNode.connectedNodes().forEach(neighbor => {
    //       if (!neighbor.data('hiddenNeighbors')) {
    //         neighbor.data('hiddenNeighbors', []);
    //       }
    //       neighbor.data('hiddenNeighbors').push(hiddenNodeId);
    //     });
    
    //     updateIndicators(); // Ensure all indicators are updated
    //   }
    // }
    

    function showAllHiddenNodes() {
      const hiddenNodes = cy.nodes(':hidden');
      initHTML();
      hiddenNodes.show();
      cy.edges(':hidden').show();
      hiddenNodes.addClass('ghost-node');
    
      // Clear hiddenNeighbors data for all nodes
      cy.nodes().forEach(node => {
        node.data('hiddenNeighbors', []);
      });
    
      updateIndicators();
    }

    function showHiddenNodes(hiddenNodeId) {
      const hiddenNode = cy.$(`#${hiddenNodeId}`);
      if (hiddenNode.hidden()) {
        // Show the hidden node
        hiddenNode.show();
        hiddenNode.connectedEdges().show();
        hiddenNode.addClass('ghost-node');
    
        // Initialize HTML for the revealed node using the helper function
        initHTMLForNodes([hiddenNode]);
    
        // Remove this node from the hiddenNeighbors list of all its neighbors
        hiddenNode.connectedNodes().forEach(neighbor => {
          let neighborsHidden = neighbor.data('hiddenNeighbors') || [];
          neighborsHidden = neighborsHidden.filter(id => id !== hiddenNodeId);
          neighbor.data('hiddenNeighbors', neighborsHidden);
        });
      } else {
        // Hide the node
        hiddenNode.hide();
        hiddenNode.connectedEdges().hide();
        hiddenNode.addClass('ghost-node');
    
        // Add this node to the hiddenNeighbors list of all its neighbors
        hiddenNode.connectedNodes().forEach(neighbor => {
          if (!neighbor.data('hiddenNeighbors')) {
            neighbor.data('hiddenNeighbors', []);
          }
          const hiddenNeighbors = neighbor.data('hiddenNeighbors');
          if (!hiddenNeighbors.includes(hiddenNodeId)) {
            hiddenNeighbors.push(hiddenNodeId);
          }
        });
        removeHtmlLabels([hiddenNode]); // Call the removeHtmlLabels function when hiding
      }
      updateIndicators(); // Ensure all indicators are updated
    }
    
    function updateIndicators() {
      cy.nodes().forEach(node => {
        const hiddenNeighbors = node.data('hiddenNeighbors') || [];
        const indicatorId = `${node.id()}-indicator`;
    
        if (hiddenNeighbors.length > 0) {
          if (!document.getElementById(indicatorId)) {
            const indicator = document.createElement('div');
            indicator.id = indicatorId;
            indicator.className = 'indicator';
            indicator.style.position = 'absolute';
            indicator.style.zIndex = '1000';
            indicator.style.pointerEvents = 'auto';
    
            // Add click event to indicator
            indicator.addEventListener('click', () => {
              hiddenNeighbors.forEach(hiddenNodeId => {
                showHiddenNodes(hiddenNodeId); // Toggle the node visibility
              });
    
              updateIndicators(); // Ensure all indicators are updated
            });
    
            document.getElementById('counter-view').appendChild(indicator);
          }
    
          // Update indicator position
          const indicator = document.getElementById(indicatorId);
          const position = node.renderedPosition();
          const width = node.renderedWidth();
          const height = node.renderedHeight();
    
          // Position the indicator at the right middle outer side of the node
          indicator.style.left = `${position.x + width / 2 + 0}px`;
          indicator.style.top = `${position.y - height / 2 + height / 2 - 0}px`;
        } else {
          const indicator = document.getElementById(indicatorId);
          if (indicator) {
            indicator.remove();
          }
        }
      });
    }
    
    
    cy.on('zoom pan', () => {
      updateIndicators();
    });
    
    updateIndicators();
    
    // cy.on('tap', 'node', event => {
    //   const node = event.target;
    //   if (node.hasClass('ghost-node')) {
    //     node.removeClass('ghost-node');
    //     node.connectedEdges().removeClass('ghost-node');
    //   }
    // });
    
    cy.on('position', 'node', () => {
      updateIndicators();
    }); 
    function initHTMLForNodes(nodes) {
      nodes.forEach(node => {
        const nodeData = node.data();
        const text = shortenLabels(nodeData);
        let html = "";
    
        if (!Array.isArray(text)){
          html += `<p style="margin:0;padding:0">${text}</p>`;
        } else {
          for (let i = 0; i < text.length; i++) {
            let color = 'black'; 
            if (cy.justification && cy.justification.has(text[i])) {
              color = colors.justNodeStroke;
            }
            if (cy.diagnoses && cy.diagnoses.has(text[i])) {
              color = colors.diagNodeStroke;
            } 
            const fontStyle = i === 0 ? 'font-style: italic;' : '';
            html += `<p style="color:${color};margin:0;padding:0;${fontStyle}">${text[i]}</p>`;
          }
        }
    
        const template = `
          <div class="cy-html node ontNode bg-box prevent-select" id="${ontologyNodeId + nodeData.id}" data-value="${nodeData.element}" data-id="${nodeData.id}">
            <div id="frontRect" style="padding: 5px; white-space:nowrap;">
              ${html}
            </div>
          </div>
        `;
    
        cy.nodeHtmlLabel([
          {
            query: `#${node.id()}`,
            valign: "center",
            halign: "center",
            tpl: () => template
          }
        ]);
      });
    }
    cy.counter = structuredClone(counter);
    console.log(elements)
    cy.stylesheet = stylesheet;
    cy.add(elements);
    await initHTML();
    // bindListeners();
    cy.layout(cy.counter).run();
    // console.log(cy);
    return cy;
}
// Function to truncate the label to three characters followed by ellipses
function truncateLabel(label) {
  if (Array.isArray(label)) {
    if (label.length === 1) {
      const firstItem = label[0];
      return firstItem.length > 7 ? firstItem.substring(0, 7) + '..' : firstItem;
    } else {
      const firstItem = label[0];
      return firstItem.substring(0, 7) + '..';
    }
  } else if (typeof label === 'string') {
    return label.length > 7 ? label.substring(0, 7) + '..' : label;
  } else {
    return label;
  }
}

// Initialize edge labels with truncated text
function initializeEdgeLabels() {
  cy.edges().forEach(edge => {
    const fullLabel = edge.data('label');
    const truncatedLabel = truncateLabel(fullLabel);
    edge.data('truncatedLabel', truncatedLabel);
    edge.style({
      'label': truncatedLabel
    });
  });
}

function shortenLabels(data) {
  let labels = data.labels;
  let shortenedLabels;
  var isChecked = document.getElementById('shortening_mode').checked;
  if (isChecked) {
    let shortening_mode_value = document.getElementById('shortening_mode_value').value;
    if (Array.isArray(labels)){
      if(shortening_mode_value > 0) {
        shortenedLabels = labels.slice(0, shortening_mode_value); 
          if (labels.length > shortening_mode_value) {
            shortenedLabels.push("...");
          }
        }
    }
  else {
    shortenedLabels = labels;
  }
  } else {
    shortenedLabels = labels;
  }
  return shortenedLabels;
}

async function initHTML() {
  const nodesHTML = document.getElementsByClassName(`cy-html`);

  // the html layer lives here, remove it before creating a new one
  if (nodesHTML[0] && nodesHTML[0].parentNode && nodesHTML[0].parentNode.parentNode) {
    nodesHTML[0].parentNode.parentNode.remove();
  }

  await cy.nodeHtmlLabel([
    {
      query: 'node',  
      tpl: function (data) {
        // console.log(data);
        if (!data.id.startsWith('gr')) {
        const text = shortenLabels(data);
        let html = "";
        // let html = !showOriginal && text.filter(element => element.trim() !== '').length > 0 ? "<div class='eye-on'><img src='../icons/eye.svg' class='node-eye' width='14' height='14'></div><div class='node-title'>" : '';
        if (!Array.isArray(text)){
          html += `
          <p style="margin:0;padding:0">
              ${text}
          </p>`;
        }
        else {
        for (let i = 0; i < text.length; i++) {
          let color = 'black'; 
          if (cy.justification && cy.justification.has(text[i])) {
            color = colors.justNodeStroke;
          }
          if (cy.diagnoses && cy.diagnoses.has(text[i])) {
            color = colors.diagNodeStroke;
          } 
          const fontStyle = i === 0 ? 'font-style: italic;' : '';
          html += `
            <p style="color:${color};margin:0;padding:0;${fontStyle}">
                ${text[i]}
            </p>`;
        }
      }
        // html += `</div>`;
        const template = `
          <div class="cy-html node ontNode bg-box prevent-select" id="${ontologyNodeId + data.id}" data-value="${data.element}" data-id = "${data.id}"> 
            <div id="frontRect" style="padding: 5px; white-space:nowrap;">
              ${html}
            </div>
          </div>
        `;

        return template;
      }
    }
    },
  ]);
  var edgeTooltip = tippy(document.createElement('div'), {
    placement: 'top-start',
    animation: 'shift-away',
    delay: [0, 500],
    arrow: false,
    followCursor: true,
    allowHTML: true,
    content: ''
});

// Define a CSS class for the red color
var redEdgeClass = 'red-edge';

// Define the CSS rules for the red color
var redEdgeStyle = {
    'line-color': 'red',
    'target-arrow-color': 'red',
    'source-arrow-color': 'red'
};

// Apply red color on hover
cy.on('mouseover', 'edge', function(event) {
    var edge = event.target;
    var label = edge.data('label');
    var formattedLabel = '';
    const showLabels = document.getElementById('edge_labels').checked;
    if (typeof label === 'string') {
        formattedLabel = label.split(',').join('<br>');
    } else if (Array.isArray(label)) {
        formattedLabel = label.join('<br>');
    }

    // Set the content of the tooltip
    edgeTooltip.setContent(formattedLabel);

    // Show the tooltip at the current mouse position
    edgeTooltip.show();

    // Add the CSS class for red color
    edge.addClass(redEdgeClass);
    edge.style(redEdgeStyle);
    edge.style('label', '');
  });

// Remove red color when mouseout
cy.on('mouseout', 'edge', function(event) {
    var edge = event.target;

    // Hide the tooltip on mouseout
    edgeTooltip.hide();
    const showLabels = document.getElementById('edge_labels').checked;
    // Remove the CSS class and style for red color
    edge.removeClass(redEdgeClass);
    edge.removeStyle('line-color');
    edge.removeStyle('target-arrow-color');
    edge.removeStyle('source-arrow-color');
    if (!showLabels) {
      edge.style('label', '');
    } else {
      edge.style('label', edge.data('truncatedLabel'));
    }
  });
var isChecked = document.getElementById('edge_bundle').checked;
if (isChecked) {
  initializeEdgeLabels();
}
}

function calcBoxWidth(longestString) {
  return (longestString * globals.fontCharacterWidth + 45) + "px";
}

function calcBoxHeight(stringList) {
  if (stringList == 'Group') {
    return (stringList.length + 35) + "px";
  }
  else {
    return (stringList.length * 20 + 35) + "px";
  }
}
function calcGroupHeight(stringList) {
  return (stringList.length + 35) + "px";
}
function processData(mapper, model) {
    // Compute edges
    // console.log(model);
    const edgeData = [].map.call(model.querySelectorAll("edge"), (d, index) => {
      const id = index + 1;
      const source = d.getAttribute("source");
      const target = d.getAttribute("target");
      const labels = d.querySelectorAll('data');
      let label ;
      labels.forEach(labelNodes => {
       label = labelNodes.textContent;
      });
      return { data: { id, source, target, label, count: 1, width: 1 } };
    });
    originalEdgeData = edgeData;
    let Edges = bundleEdges(edgeData);
    const nodeData = [].map.call(model.querySelectorAll("node"), (d) => {
      let dataNodes, labels, element, elements, id;

      id = d.getAttribute("id");

      dataNodes = d.querySelectorAll("data");
      dataNodes.forEach((item) => {
        if (item.getAttribute("key") === "label") {
          labels = item.textContent;
        } else if (item.getAttribute("key") === "element") {
          element = item.textContent;
          elements = {};
          element.split("\n").forEach((a, i) => {
            elements[a] = i;
          });
        }
      });
      let edgeFromParent;
      edgeData.forEach((edge) => {
        if (edge.data.source === id) {
          edgeFromParent = edge.data;
        }
      })
      // const edgeFromParent = edgeData.find((edge) => edge.source === id);
      const parentId = edgeFromParent == null ? "" : edgeFromParent.target;
      labels = labels.replace(/\[|\]|\s/g, "").split(",");
      const text = labels;
      let longest = 1;
      text.forEach(l => {
        if (l.length > longest) {
          longest = l.length;
        }
      });

      // Initialize importantLabel and importantValue
      let importantLabel = null;
      // Loop through each key in the mapper
      Object.entries(mapper["Concept2Representative"]).forEach(([value, key]) => {
        // If the element value of the node matches a key in the mapper
        if (element === key) {
          let labelFound = checkIfImportantLabelMatchesWholeLabel(labels, value);
            if (labelFound) {
                importantLabel = labelFound;
                return;
              }
        labelFound = checkIfImportantLabelContainsLabel(labels, value);
          if (labelFound) {
            importantLabel = labelFound;
          }
        }
      });
      // Updating Label and setting the important label as Important Concept
      if (importantLabel != null){
      let labelIndex = labels.indexOf(importantLabel);
      if (labelIndex === -1) {
        labels.unshift(importantLabel);
      }
      else {
        labels.splice(labelIndex,1);
        labels.unshift(importantLabel);
      }
    }
      return {
        data: {
          id,
          labels,
          element,
          elements,
          importantLabel,
          parentId,
          boxH: calcBoxHeight(text),
          boxW: calcBoxWidth(longest)
        }
      };
    });
    return {
      nodes: nodeData,
      edges: Edges,
      groups: [],
    };
  }

function checkIfImportantLabelMatchesWholeLabel(labels, importantLabel) {
  // console.log(importantLabel)
    for (let label of labels) {
        if (label === importantLabel) return label;
    }
    return undefined;
}
function checkIfImportantLabelContainsLabel(labels, importantLabel) {
  for (let label of labels) {
      if (importantLabel.includes(label)) return label;
  }
  return undefined;
}
function bundleEdges(edgeData) {
  let isChecked = document.getElementById('edge_bundle').checked;
  if (isChecked) {
    return mergeLabels(edgeData);
  } else {
    return originalEdgeData;
  }
}
function mergeLabels(edges) {
  const uniqueEdges = {};

  edges.forEach(edge => {
    const { source, target, label } = edge.data;
    const key = `${source}-${target}`;

    if (uniqueEdges.hasOwnProperty(key)) {
      const existingLabel = uniqueEdges[key].data.label;
      if (Array.isArray(existingLabel)) {
        uniqueEdges[key].data.label.push(label);
      } else if (existingLabel !== label) {
        uniqueEdges[key].data.label = [existingLabel, label];
      }
      uniqueEdges[key].data.count += 1;
      uniqueEdges[key].data.width = uniqueEdges[key].data.count; // Set the width based on count
    } else {
      uniqueEdges[key] = { data: { source, target, label, count: 1, width: 1 } };
    }
  });

  const mergedEdges = Object.values(uniqueEdges);
  return mergedEdges;
}

// grouping();

function UpdateNodeslabel(layout = true) {
  cy.startBatch();
  // const nodesHTML = [...document.getElementsByClassName(`cy-html`)];
  // nodesHTML.forEach(node => {
  //     if (node.parentNode && node.parentNode.parentNode) {
  //         node.parentNode.parentNode.remove();
  //     }
  // });
  cy.nodes().forEach(function (node) {
    // node.removeStyle();
    const d = node.data();
    let text = shortenLabels(d);
    let longest = 5;
    if(Array.isArray(text)){
      text.forEach(l => {
        if (l.length > longest) {
          longest = l.length;
        }
      });
    }

    d.boxH = calcBoxHeight(text);
    d.boxW = calcBoxWidth(longest);
    // Resetting data nodes to false for eye functionality removes all previous saved values and starts fresh.
    d.revealed = false;
  });
  cy.style().update();
  cy.endBatch();
  if (layout) {
    // cy.layout(cy.counter).run();
}
}

function createParentNode(id, groupName, boxH, boxW, parent = undefined) {
  const parentNode = {
    data: {
      id: id,
      labels: groupName,
      boxH: boxH,
      boxW: boxW
    },
    classes: 'grouped'
  };

  cy.add(parentNode);

  if (parent) {
    cy.$('#' + id).move({ parent: parent });
  }

  cy.style()
    .selector('#' + id)
    .style({
      'content': groupName,
      'text-valign': 'top',
      'text-halign': 'center',
      'font-size': '14px',
      'color': '#000',
      'text-margin-y': -30 / -1.2,
      'width':boxW,
      'height':boxH,
    })
    .update();

  return id;
}

function addParentNode(idSuffix, parent = undefined, groupName = "Group") {
  const id = 'gr' + idSuffix;
  const labelHeight = 30; // Space for the label at the top
  const boxH = calcGroupHeight(groupName) + labelHeight;
  const boxW = calcBoxWidth(groupName.length);

  return createParentNode(id, groupName, boxH, boxW, parent);
}


function checkAndRemoveEmptyGroups() {
  cy.nodes(':parent').forEach(group => {
    if (group.children().length === 0) {
      cy.remove(group);
    }
  });
}
console.log(DATA_STRUCTURE.originalData);
export{createContent, cy, calcGroupHeight, calcBoxWidth}