import { readFiles } from "./fileReader.js";
import { globals } from "../shared-data.js";
import { stylesheet } from "../../../style/counter-cy-style.js";
import { counter } from "../layouts/cola.js";

let cy;
const ontologyNodeId = "oN";
let originalEdgeData = [];
let div = "counter-example-container";


await readFiles();

async function createContent(mapper, model) {
  const existingSVG = document.getElementById('counter-view');
  if (existingSVG) {
    existingSVG.remove();
  }

  const svg = document.createElement('svg');
  svg.id = 'counter-view';
  document.getElementById(div).append(svg);

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
  }).on('cxttap', function (event) {

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

    const hiddenNodesExist = cy.nodes(':hidden').length > 0;
    if (hiddenNodesExist) {
      contextMenu.showMenuItem('show-hidden-nodes');
    } else {
      contextMenu.hideMenuItem('show-hidden-nodes');
    }
  });

  const handleLayoutEvent = function (enabled) {
    return function () {
      cy.userZoomingEnabled(enabled);
      cy.userPanningEnabled(enabled);
      cy.autoungrabify(!enabled);
    };
  };

  cy.on('layoutstart', handleLayoutEvent(false));
  setTimeout(function () {
    cy.on('layoutstop', handleLayoutEvent(true));
  }, 100);

  document.getElementById('lasso_selection').addEventListener('click', function () {
    cy.lassoSelectionEnabled(true);
  });

  document.getElementById('clear_selection').addEventListener('click', function () {
    cy.nodes().unselect();
  });
  const shortened_rangeInput = document.getElementById('shortening_mode_value');
  const shortened_badge = document.getElementById('shortened-value');
  document.getElementById('shortening_mode_value').addEventListener('input', function () {
    // Check if the checkbox is checked
    UpdateNodeslabel();
    shortened_badge.textContent = shortened_rangeInput.value;
    // Now you can use the isChecked variable to perform actions based on whether the checkbox is checked or not
  });

  document.getElementById('shortening_mode').addEventListener('click', function () {
    // Check if the checkbox is checked
    UpdateNodeslabel();
    // Now you can use the isChecked variable to perform actions based on whether the checkbox is checked or not
  });
  document.getElementById('edge_labels').addEventListener('click', function () {
    const showLabels = document.getElementById('edge_labels').checked;

    cy.edges().forEach(edge => {
      edge.style({
        'label': showLabels ? edge.data('truncatedLabel') : ''
      });
    });
  });
  document.getElementById('edge_bundle').addEventListener('click', function () {
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
  document.getElementById('show_hidden_nodes').addEventListener('click', showAllHiddenNodes);

  // Contect Menu Options lists
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

          const createGroup = (groupName) => {
            const id = new Date().getTime();
            const groupId = addParentNode(id, null, groupName);

            selectedElems.forEach(elem => {
              elem.move({ parent: groupId });
            });
          };

          if (uniqueParentNodes.size > 1 || (uniqueParentNodes.size === 1 && selectedElems.not(':parent').length > 0)) {
            swal({
              text: 'Enter group name:',
              content: "input",
              buttons: ["Cancel", "OK"]
            })
              .then(groupName => {
                if (groupName !== null) {
                  createGroup(groupName || "Group");
                }
              });
          } else {
            const groupNode = selectedElems.filter(':parent');
            const nonGroupNodes = selectedElems.not(':parent');

            if (groupNode.length > 0 && nonGroupNodes.length > 0) {
              // If both a group node and other nodes are selected, add the nodes to the group
              const groupId = groupNode[0].id();
              nonGroupNodes.move({ parent: groupId });
            } else {
              const parent = selectedElems[0].parent().id();
              swal({
                text: 'Enter group name:',
                content: "input",
                buttons: ["Cancel", "OK"]
              })
                .then(groupName => {
                  if (groupName !== null) {
                    const id = new Date().getTime();
                    const groupId = addParentNode(id, parent, groupName || "Group");
                    selectedElems.forEach(elem => {
                      elem.move({ parent: groupId });
                    });
                  }
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
    ],
    menuItemClasses: ['custom-menu-item'],
    contextMenuClasses: ['custom-context-menu'],
    submenuIndicator: { src: '../icons/submenu-indicator-default.svg', width: 12, height: 12 }
  });

  // Remove HTML when we hide nodes
  function removeHtmlLabels(nodes) {
    nodes.forEach(node => {
      const htmlElement = document.getElementById(ontologyNodeId + node.id());
      if (htmlElement && htmlElement.parentNode) {
        htmlElement.parentNode.remove();
      }
    });
  }

  // Hide node functionality start
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
      // Remove indicator for the node being hidden
      const indicatorId = `${node.id()}-indicator`;
      const indicator = document.getElementById(indicatorId);
      if (indicator) {
        indicator.remove();
      }
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
    const indicatorId = `${hiddenNodeId}-indicator`;

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

      // Remove hidden-nodes class and add showing-nodes class
      const indicator = document.getElementById(indicatorId);
      if (indicator) {
        indicator.classList.remove('hidden-nodes');
        indicator.classList.add('showing-nodes');
      }
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

      // Remove the indicator immediately
      const indicator = document.getElementById(indicatorId);
      if (indicator) {
        indicator.classList.remove('showing-nodes');
        indicator.classList.add('hidden-nodes');
      }
    }

    updateIndicators(); // Ensure all indicators are updated
  }

  function updateIndicators() {
    cy.nodes(':visible').forEach(node => {
      const hiddenNeighbors = node.data('hiddenNeighbors') || [];
      const indicatorId = `${node.id()}-indicator`;

      let indicator = document.getElementById(indicatorId);
      if (hiddenNeighbors.length > 0) {
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.id = indicatorId;
          indicator.className = 'indicator hidden-nodes';
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
        } else {
          // Ensure correct class is set based on the state
          if (node.connectedEdges(':hidden').length > 0) {
            indicator.classList.add('hidden-nodes');
            indicator.classList.remove('showing-nodes');
          } else {
            indicator.classList.add('showing-nodes');
            indicator.classList.remove('hidden-nodes');
          }
        }

        // Update indicator position
        const position = node.renderedPosition();
        const width = node.renderedWidth();
        const height = node.renderedHeight();

        indicator.style.left = `${position.x + width / 2.12}px`; // Right side of the node
        indicator.style.top = `${position.y - height / 2.12 - indicator.offsetHeight}px`; // Top side of the node
      } else if (indicator) {
        indicator.remove();
      }
    });
  }

  cy.on('zoom pan', () => {
    updateIndicators();
  });

  updateIndicators();


  cy.on('position', 'node', () => {
    updateIndicators();
  });
  // Hide node functionality ends

  // For again adding html to hidden nodes
  function initHTMLForNodes(nodes) {
    nodes.forEach(node => {
      const nodeData = node.data();
      const text = shortenLabels(nodeData);
      let html = "";
      let color = 'black';
      if (!Array.isArray(text)) {
        html += `<p style="margin:0;padding:0">${text}</p>`;
      } else {
        for (let i = 0; i < text.length; i++) {
          const label = text[i];
          // Check if label has a specific color assigned
          if (labelColorMap[label]) {
            color = labelColorMap[label];
          }
          else {
            color = 'black';
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

// Function to truncate the label to three characters followed by ellipses in Edge labels
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

// Shorten node labels
function shortenLabels(data) {
  let labels = data.labels;
  let importantLabel = data.importantLabel;
  let shortenedLabels = [];
  const isChecked = document.getElementById('shortening_mode').checked;
  const shortening_mode_value = parseInt(document.getElementById('shortening_mode_value').value, 10);

  const important = new Set();
  const highlighted = [];
  const otherLabels = [];

  if (Array.isArray(importantLabel)) {
    importantLabel.forEach(label => important.add(label));
  } else if (importantLabel) {
    important.add(importantLabel);
  }

  labels.forEach(label => {
    if (important.has(label)) {
      shortenedLabels.push(label);
    } else if (highlightedLabels.has(label)) {
      highlighted.push(label);
    } else {
      otherLabels.push(label);
    }
  });

  if (isChecked && shortening_mode_value > 0) {
    const maxLabelsToShow = Math.max(shortening_mode_value, shortenedLabels.length + highlighted.length);
    shortenedLabels.push(...highlighted);
    shortenedLabels.push(...otherLabels);

    if (shortenedLabels.length > maxLabelsToShow) {
      shortenedLabels = shortenedLabels.slice(0, maxLabelsToShow);
      shortenedLabels.push("...");
    }
  } else {
    shortenedLabels.push(...highlighted);
    shortenedLabels.push(...otherLabels);
  }

  return shortenedLabels;
}

// Adding HTML to nodes 
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
        if (!data.id.startsWith('gr')) {
          const text = shortenLabels(data);
          let italic;
          data.importantLabel !== null ? italic = 'italic' : '';
          let html = "";
          if (!Array.isArray(text)) {
            html += `
          <p style="margin:0;padding:0">
              ${text}
          </p>`;
          }
          else {
            for (let i = 0; i < text.length; i++) {
              let color = 'black';
              let bold = '';
              const label = text[i];

              // Check if label has a specific color assigned
              if (labelColorMap[label]) {
                color = labelColorMap[label];
                bold = "font-weight:bold";
              }
              const fontStyle = i === 0 ? 'font-style:' + italic + ';' : '';
              html += `
            <p style="color:${color};${bold};margin:0;padding:0;${fontStyle}">
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

  // Adding a tooltip on the edge & edge hover effects
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

  // Apply red color on hover
  cy.on('mouseover', 'edge', function (event) {
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
    edge.style('label', '');
  });

  // Remove red color when mouseout
  cy.on('mouseout', 'edge', function (event) {
    var edge = event.target;

    // Hide the tooltip on mouseout
    edgeTooltip.hide();
    const showLabels = document.getElementById('edge_labels').checked;
    // Remove the CSS class and style for red color
    edge.removeClass(redEdgeClass);
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
  return (35) + "px";
}

// Creating an edge and node arrays for CY
function processData(mapper, model) {
  // Compute edges
  // console.log(model);
  const edgeData = [].map.call(model.querySelectorAll("edge"), (d, index) => {
    const id = index + 1;
    const source = d.getAttribute("source");
    const target = d.getAttribute("target");
    const labels = d.querySelectorAll('data');
    let label;
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
    let labelStructure;
    // Loop through each key in the mapper
    Object.entries(mapper["Concept2Representative"]).forEach(([value, key]) => {
      // If the element value of the node matches a key in the mapper
      if (element === key) {
        let labelFound = checkIfImportantLabelMatchesWholeLabel(labels, value);
        labelStructure = value;
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
    if (importantLabel != null) {
      let labelIndex = labels.indexOf(importantLabel);
      if (labelIndex === -1) {
        labels.unshift(importantLabel);
      }
      else {
        labels.splice(labelIndex, 1);
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
        labelStructure,
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


function UpdateNodeslabel(layout = true) {
  cy.startBatch();
  cy.nodes().forEach(function (node) {
    // node.removeStyle();
    const d = node.data();
    let text = shortenLabels(d);
    let longest = 5;
    if (Array.isArray(text)) {
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
      'width': boxW,
      'height': boxH,
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

// For Sidebar Controls
const sidebarToggles = document.getElementsByClassName("toggles-sidebar");
const btnToggleSideBar = document.getElementById("btnToggleSideBar");

function slideIn() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("bar-sliding-out");
  sidebar.classList.add("bar-sliding-in");

  const icon = document.getElementById("iconToggleSideBar");
  icon.classList.remove("icon-sliding-out");
  icon.classList.add("icon-sliding-in");
}

function slideOut() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("bar-sliding-in");
  sidebar.classList.add("bar-sliding-out");

  const icon = document.getElementById("iconToggleSideBar");
  icon.classList.remove("icon-sliding-in");
  icon.classList.add("icon-sliding-out");
}

function toggleSidebar() {
  if (btnToggleSideBar.classList.contains("active")) {
    slideOut();
  } else {
    slideIn();
  }
  btnToggleSideBar.classList.toggle("active");

  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("reinit-minimap"));
  }, 250); // wait for animation to finish
}

function setTabFromDirectControl(srcID, toggleIfOpen = true) {
  if (document.getElementById(srcID).classList.contains("active") && toggleIfOpen) {
    toggleSidebar();
  } else {
    const tabs = document.querySelector(".tabs");
    M.Tabs.getInstance(tabs).select(srcID);
    !btnToggleSideBar.classList.contains("active") && toggleSidebar();
  }
}


function showSettingsTab(toggleIfOpen = true) {
  setTabFromDirectControl("sidebarSettings", toggleIfOpen);
}

for (const c of sidebarToggles) {
  c.addEventListener("click", toggleSidebar);
}

const settingsSidebar = document.getElementById("sidebarSettings");
const settingsButton = document.getElementById("showSettingsMenuButton");

if (settingsButton) {
  if (settingsSidebar !== null) {
    settingsButton.addEventListener("click", showSettingsTab);
  } else {
    settingsButton.style.display = "none";
  }
}

const searchBar = document.getElementById('search-bar');
const tagsContainer = document.getElementById('tags');
const labelColorMap = {};
const highlightedLabels = new Set();

searchBar.addEventListener('input', handleSearch);
tagsContainer.addEventListener('click', handleTagClick);

function handleSearch(event) {
  const query = event.target.value.toLowerCase();
  const resultsContainer = document.getElementById('search-results');

  if (!query) {
    resultsContainer.innerHTML = ''; // Clear search results if query is empty
    return;
  }

  const results = new Set(); // Use a Set to collect unique labels

  // Search node labels
  cy.nodes().forEach(node => {
    const labels = node.data('labels');
    if (Array.isArray(labels)) {
      labels.forEach(label => {
        if (label.toLowerCase().includes(query)) {
          results.add(label);
        }
      });
    }
  });

  // Search edge labels
  cy.edges().forEach(edge => {
    const labels = edge.data('label');
    if (Array.isArray(labels)) {
      labels.forEach(label => {
        if (label.toLowerCase().includes(query)) {
          results.add(label);
        }
      });
    } else if (typeof labels === 'string') {
      if (labels.toLowerCase().includes(query)) {
        results.add(labels);
      }
    }
  });

  showSearchResults(Array.from(results)); // Convert the Set to an Array
}

function showSearchResults(results) {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = ''; // Clear previous results

  results.forEach(label => {
    const resultItem = document.createElement('div');
    resultItem.textContent = label;
    resultItem.style.cursor = 'pointer';
    resultItem.addEventListener('click', () => {
      highlightLabel(label);
      resultsContainer.innerHTML = ''; // Close search results
      searchBar.value = ''; // Clear search bar

      // Highlight label in graph with tag color
      const tagColor = getTagColor(label); // Function to get color assigned to tag
      applyColorToLabelInGraph(label, tagColor); // Function to apply color to label in Cytoscape
    });
    resultsContainer.appendChild(resultItem);
  });
}

function highlightLabel(label) {
  let color = localStorage.getItem(`labelColor_${label}`);
  if (!color) {
    color = getRandomColor();
    localStorage.setItem(`labelColor_${label}`, color);
  }
  labelColorMap[label] = color;
  cy.nodes().forEach(node => {
    const nodeLabels = node.data('labels');
    if (Array.isArray(nodeLabels) && nodeLabels.includes(label)) {
      node.style('color', labelColorMap[label]); // Update color style for the node
    } 1
  });

  if (!highlightedLabels.has(label)) {
    highlightedLabels.add(label);
    addTag(label, labelColorMap[label]);
  }

  updateSearchResults();
}

function addTag(label, color) {
  const tag = document.createElement('div');
  tag.className = 'counter-search-tag';
  tag.title = 'remove';
  tag.style.backgroundColor = color;
  tag.textContent = label;
  tag.addEventListener('click', () => removeHighlight(label));
  tagsContainer.appendChild(tag);
}

function removeHighlight(label) {
  cy.nodes().forEach(node => {
    const nodeLabels = node.data('labels');
    if (Array.isArray(nodeLabels) && nodeLabels.includes(label)) {
      node.style('color', '');
    }
  });
  cy.edges().forEach(edge => {
    const labels = edge.data('label');
    if (Array.isArray(labels) && labels.includes(label) || labels === label) {
      edge.style('line-color', '');
      edge.style('target-arrow-color', '');
      edge.style('source-arrow-color', '');
    }
  });
  highlightedLabels.delete(label);
  removeTag(label);
  updateSearchResults();
  delete labelColorMap[label];
}

function removeTag(label) {
  const tags = document.querySelectorAll('.counter-search-tag');
  tags.forEach(tag => {
    if (tag.textContent === label) {
      tag.remove();
    }
  });
}

function handleTagClick(event) {
  if (event.target.classList.contains('tag')) {
    const label = event.target.textContent;
    removeHighlight(label);
  }
}

function updateSearchResults() {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  const query = searchBar.value.toLowerCase();
  cy.nodes().forEach(node => {
    const nodeLabels = node.data('labels');
    const labels = Array.isArray(nodeLabels) ? nodeLabels.map(label => label.toLowerCase()) : [];
    const resultItem = Array.from(resultsContainer.children).find(item =>
      labels.includes(item.textContent.toLowerCase())
    );
    if (resultItem) {
      resultItem.style.color = labelColorMap[resultItem.textContent] || '';
    }
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
function getTagColor(label) {
  if (!labelColorMap[label]) {
    labelColorMap[label] = getRandomColor();
  }
  return labelColorMap[label];
}
function applyColorToLabelInGraph(label, color) {
  // Apply color to edges in Cytoscape based on label
  cy.edges().forEach(edge => {
    const labels = edge.data('label');
    if (Array.isArray(labels) && labels.includes(label) || labels === label) {
      edge.style('line-color', color);
      edge.style('target-arrow-color', color);
      edge.style('source-arrow-color', color);
    }
  });
}

// Function to calculate dimensions using existing functions
function getDimensionsForLabel(label) {
  let longestStringLength = 0;
  let heightString = '';

  if (Array.isArray(label)) {
    longestStringLength = label.reduce((max, line) => Math.max(max, line.length), 0);
    heightString = label.join('\n');
  } else if (typeof label === 'string') {
    longestStringLength = label.length;
    heightString = label;
  }

  return {
    boxW: calcBoxWidth(longestStringLength),
    boxH: calcBoxHeight([heightString])
  };
}

// Render the subgraph with calculated dimensions
function renderSubgraph(currentNode, connectedNodes) {
  const currentNodeLabel = currentNode.data('importantLabel') || currentNode.id();
  const connectedLabels = connectedNodes.map(node => node.data('importantLabel') || node.id());

  const elements = [
    {
      data: {
        id: currentNode.id(),
        label: currentNodeLabel,
        ...getDimensionsForLabel(currentNodeLabel)
      }
    },
    ...connectedNodes.map(node => ({
      data: {
        id: node.id(),
        label: node.data('importantLabel') || node.id(),
        ...getDimensionsForLabel(node.data('importantLabel') || node.id())
      }
    })),
    ...connectedNodes.map(node => {
      const edge = currentNode.edgesTo(node);
      let edgeLabel = edge.data('label');
      let formattedLabel = '';
      if (typeof edgeLabel === 'string') {
        formattedLabel = edgeLabel.split(',').join('<br>');
      } else if (Array.isArray(edgeLabel)) {
        formattedLabel = edgeLabel.join(', ');
      }
      return {
        data: {
          id: `${currentNode.id()}-${node.id()}`,
          source: currentNode.id(),
          target: node.id(),
          label: formattedLabel // Add edge label here
        }
      };
    })
  ];
  const subgraph = cytoscape({
    container: document.getElementById('subgraph'),
    elements: elements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'shape': 'round-rectangle',
          'background-color': 'hsl(31, 87%, 94%)',
          'border-style': 'solid',
          'border-width': '1px',
          'border-color': 'hsl(30, 89%, 68%)',
          'height': 'data(boxH)',
          'width': 'data(boxW)',
        }
      },
      {
        selector: 'edge',
        style: {
          'label': 'data(label)',
          'width': 1.5,
          'line-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'source-arrow-color': '#ccc',
          'source-arrow-shape': 'none',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: counter
  });
}

// Event listener for double click on a node
cy.on('dblclick', 'node', (event) => {
  const node = event.target;
  const labelStructure = node.data('labelStructure');
  const importantLabel = node.data('importantLabel');

  // Get connected nodes with importantLabel where the edge is directed from the current node
  const connectedImportantNodes = node.outgoers('node').filter(n => n.data('importantLabel') && n.data('importantLabel') !== null);

  let content = `<h6>${labelStructure || ''}</h6>`;

  if (importantLabel === null || connectedImportantNodes.length === 0) {
    content += `<p>No structure could be found for this node.</p>`;
  } else {
    content += `<div id="subgraph" style="width: 100%; height: 300px;"></div>`;
  }

  // SweetAlert popup
  swal({
    title: 'Important Structure',
    text: ' ',
    className: 'importantStructure',
    content: {
      element: "div",
      attributes: {
        innerHTML: content
      }
    },
    buttons: {
      confirm: {
        text: 'OK',
        value: true,
        visible: true,
        className: '',
        closeModal: true
      }
    },
    closeOnClickOutside: false,
    width: 800
  });

  // Ensure the content is injected
  setTimeout(() => {
    if (importantLabel !== null && connectedImportantNodes.length > 0) {
      renderSubgraph(node, connectedImportantNodes);
    }
  }, 100);
});


function init_counter({
  ad,
  container = "proof-container",
}) {
  div = container;

  let mappers = readJson("js/counterexample/example/mapper.json");
  let model = readXML("js/counterexample/example/result.model.xml");
  createContent(mappers, model);
}

export { createContent, cy, calcGroupHeight, calcBoxWidth, init_counter }