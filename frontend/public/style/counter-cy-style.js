const colors = {
    SELECTED_BORDER: "#4887b9",
    SELECTED_NODE_COLOR: "#4887b9",
  
    // taken from style/widgets/general
    compNodeFill: 'hsl(31, 87%, 94%)',
      compNodeStroke: 'hsl(30, 89%, 68%)',
    justNodeFill: '#e0f2f1',
      justNodeStroke: '#80cbc4',
    diagNodeFill: '#fdefe3', 
    diagNodeStroke: '#bb6b20',
    fixedNodeFill: '#eceff1',
    fixedNodeStroke: '#b0bec5',
  }

  const stylesheet = [
    {
      "selector": "core",
      "style": {
        "selection-box-color": colors.SELECTED_NODE_COLOR,
        "selection-box-border-color": "#8BB0D0",
        "selection-box-opacity": "0.5"
      }
    }, {
      "selector": "node",
      "style": {
        'shape':'round-rectangle',
        'background-color': colors.compNodeFill,
        'border-style': 'solid',
        'border-width': '1px',
        'border-color': colors.compNodeStroke,
        'height': 'data(boxH)',
        'width': 'data(boxW)',
      }
    }, {
      "selector": "node.justification",
      "style": {
        'background-color': colors.justNodeFill,
        'border-color': colors.justNodeStroke,
      }
    }, {
      "selector": "node.diagnoses",
      "style": {
        'background-color': colors.diagNodeFill,
        'border-color': colors.diagNodeStroke,
      }
    }, {
      "selector": "node.fixed-diagnosis",
      "style": {
        'background-color': colors.fixedNodeFill,
        'border-color': colors.fixedNodeStroke,
        'border-width': '3px',
        'background-image': '../icons/mui-lock.svg',
        'background-image-containment': 'over',
        'bounds-expansion': '20px',
        'background-clip': 'none',
        'background-height': '15px',
        'background-width': '15px',
        'background-position-x': '50%',
        'background-position-y': '-18px',
      }
    }, {
      "selector": "node:selected",
      "style": {
        'border-width': '3px',
      }
    }, {
      "selector": "edge",
      "style": {
        'font-size': 8,
        'curve-style': 'bezier', //taxi
        'width': 'data(width)',
        'target-arrow-shape': 'triangle',
        'label': 'data(truncateLabel)'
      }
    }, {
      selector: ':parent',
      style: {
        "background-color": "#e3f2fd",
        'font-size': '14px',
        'color': '#000',
        'text-valign': 'top',
        'text-halign': 'center',
        'padding': '30px',
      }
    },
    {
      selector: '.hidden-neighbors:after',
      style: {
        "content": "",
        "position": "absolute",
        "top": "50%",
        "left": "-10",
        "width": "10px",
        "height": "10px",
        "background-color": "#e3f2fd"
       }
    },
    {
      selector: "node.cy-expand-collapse-collapsed-node",
      style: {
        "background-color": "#e3f2fd",
        "shape": "round-rectangle",
        "border-color":"#64b5f6"
      }
    },
    // {
    //   selector: '.editable-group',
    //   style: {
    //     'background-color': '#ddd',
    //     'text-valign': 'center',
    //     'text-halign': 'center',
    //     'shape': 'round-rectangle',
    //     'width': 'data(boxW)',
    //     'height': 'data(boxH)',
    //     'label': 'data(labels)',
    //     'overlay-opacity': 0,
    //     'z-index': 10,
    //     'position': 'relative'
    //   }
    // },
    // {
    //   selector: '.editable-group:hover',
    //   style: {
    //     'background-color': '#ddd',
    //     'text-valign': 'center',
    //     'text-halign': 'center',
    //     'shape': 'round-rectangle',
    //     'width': 'data(boxW)',
    //     'height': 'data(boxH)',
    //     'label': 'data(labels)',
    //     'overlay-opacity': 0,
    //     'z-index': 10,
    //     'position': 'relative',
    //     'background-image': '../icons/edit-icon.svg', // Replace with your pencil icon URL
    //     'background-fit': 'contain',
    //     'background-opacity': 1,
    //     'background-position-x': '95%',
    //     'background-position-y': '5%',
    //     'background-width': '20px',
    //     'background-height': '20px'
    //   }
    // },
    {
      selector: '.ghost-node',
      style: {
        'border-color': '#666666',
        'background-color': '#f5f5f5',
      }
    }
  ];
  
  export { stylesheet, colors }