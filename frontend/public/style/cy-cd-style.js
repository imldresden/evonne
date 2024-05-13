const colors = {
  SELECTED_BORDER: "#4887b9",
  SELECTED_NODE_COLOR: "#4887b9",

  // taken from style/widgets/general
  nodeText: '#000',

  edgeWeightTextColor: '#b34343',
  edgeColor: '#db9e9e',

}
const edge = {
  "text-background-opacity": 1,
  "text-background-color": "#fafafa",
  'font-family': 'Hack, monospace',
  'label': 'data(label)',
  'font-size': 7,
  'curve-style': 'bezier', //taxi
  'width': .5,
  'line-color': '#ccc',
  'target-arrow-color': '#ccc',
  'target-arrow-shape': 'triangle',
  'arrow-scale': .5,
}

const node = {
  'font-family': 'Hack, monospace',
  'font-size': 7,
  "text-valign": "center",
  "text-halign": "center",
  "color": colors.nodeText,
  'content': 'data(v)',
  'shape': 'round-rectangle',
  'background-color': '#fafafa',
  'height': 10,
  'width': 'data(w)',
}

const stylesheet = [
  {
    "selector": "core",
    "style": {
      "selection-box-color": colors.SELECTED_NODE_COLOR,
      "selection-box-border-color": "#fafafa",
      "selection-box-opacity": "0",
    }
  }, {
    "selector": "node",
    "style": node,
  }, {
    "selector": "node:selected",
    "style": node,
  }, {
    "selector": "edge",
    "style": edge,
  }, {
    "selector": "edge:selected",
    "style": edge,
  }, {
    "selector": "edge.negated",
    "style": {
      'line-style': 'dashed',
    },
  }, {
    "selector": "edge.thick",
    "style": {
      'width': 1.5,
    },
  }, {
    "selector": "edge.highlighted",
    "style": {
      'color': colors.edgeWeightTextColor,
      'line-color': colors.edgeColor,
      'target-arrow-color': colors.edgeColor,
    }
  }
];

export { stylesheet, colors }