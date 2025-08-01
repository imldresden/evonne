const colors = {
  SELECTED_BORDER: "#4887b9",
  SELECTED_NODE_COLOR: "#4887b9",

  // taken from style/widgets/general
  compNodeFill: 'hsl(205, 87%, 94%)',
	compNodeStroke: 'hsl(207, 89%, 68%)',
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
    "selector": ":active",
    "style": {
      "overlay-padding": 0,
      "overlay-opacity": 0
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
      'label': 'data(label)',
      'font-size': 8,
      'curve-style': 'bezier', //taxi
      'width': 1.5,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#ccc',
      'line-color': '#ccc',
    }
  }
];

export { stylesheet, colors }