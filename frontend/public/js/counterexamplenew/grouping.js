import { cy, calcGroupHeight, calcBoxWidth } from "./counterexample.js";

function checkAndRemoveEmptyGroups() {
  cy.nodes(':parent').forEach(group => {
    if (group.children().length === 0) {
      cy.remove(group);
    }
  });
}

function grouping() {
  var api = cy.expandCollapse('get');

  document.getElementById('add-compound').addEventListener('click', function () {
    const selectedElems = cy.nodes(':selected');
    if (selectedElems.length < 1) {
      return;
    }

    const groupNode = selectedElems.filter(':parent');
    const nonGroupNodes = selectedElems.not(':parent');

    if (groupNode.length > 0 && nonGroupNodes.length > 0) {
      // If both a group node and other nodes are selected, add the nodes to the group
      const groupId = groupNode[0].id();
      nonGroupNodes.move({ parent: groupId });
    } else {
      // Create a new group
      const parent = selectedElems[0].parent().id();
      for (let i = 1; i < selectedElems.length; i++) {
        if (parent !== selectedElems[i].parent().id()) {
          return;
        }
      }
      const id = new Date().getTime();
      const groupName = prompt("Enter group name:", "Group") || "Group";
      addParentNode(id, parent, groupName);
      for (let i = 0; i < selectedElems.length; i++) {
        selectedElems[i].move({ parent: 'c' + id });
        // Adjust position to ensure no overlap with label
        const pos = selectedElems[i].position();
        selectedElems[i].position({ x: pos.x, y: pos.y + 30 });
      }
    }
  });

  document.getElementById('remove-compound').addEventListener('click', function () {
    const selectedElems = cy.nodes(':selected');
    if (selectedElems.length < 1) {
      return;
    }

    selectedElems.forEach(node => {
      const parent = node.parent();
      if (parent.isParent()) {
        node.move({ parent: null });

        // Check if parent has become empty and remove it if so
        if (parent.children().length === 0) {
          cy.remove(parent);
        }
      }
    });
  });

  // Handle group name input field updates
  // document.getElementById('group_name').addEventListener('input', function () {
  //   const selectedGroup = cy.nodes(':selected').filter(':parent');
  //   if (selectedGroup.length === 1) {
  //     const newName = document.getElementById('group_name').value;
  //     selectedGroup.data('labels', newName);
  //     selectedGroup.data('boxH', calcGroupHeight(newName));
  //     selectedGroup.data('boxW', calcBoxWidth(newName));
  //   }
  // });

  // Update input field with selected group's name
  // cy.on('select', 'node:parent', function (event) {
  //   const group = event.target;
  //   document.getElementById('group_name').value = group.data('labels');
  // });

  cy.on('remove', 'node', function (event) {
    checkAndRemoveEmptyGroups();
  });
}

export { grouping }