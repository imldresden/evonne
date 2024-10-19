const colors = {
  SELECTED_BORDER: "#4887b9",
  SELECTED_NODE_COLOR: "#4887b9",

  // taken from style/widgets/general
  compNodeFill: 'hsl(31, 87%, 94%)',
  compNodeStroke: 'hsl(30, 89%, 68%)',
}

const edge = {
  'font-family': 'Hack, monospace',
  'font-size': 7,
  'curve-style': 'bezier',
  'width': 'data(width)',
  'label': 'data(truncateLabel)',
  'target-arrow-shape': 'triangle',
  'target-arrow-color': '#ccc',
  'line-color': '#ccc',
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
      'shape': 'round-rectangle',
      'background-color': colors.compNodeFill,
      'border-style': 'solid',
      'border-width': '1px',
      'border-color': colors.compNodeStroke,
      'height': 'data(boxH)',
      'width': 'data(boxW)',
    }
  }, {
    "selector": "node:selected",
    "style": {
      'border-width': '3px',
    }
  }, {
    "selector": "edge",
    "style": edge,
  }, {
    "selector": "edge:selected",
    "style": edge,
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
  }, {
    selector: "node.cy-expand-collapse-collapsed-node",
    style: {
      "background-color": "#e3f2fd",
      "shape": "round-rectangle",
      "border-color": "#64b5f6"
    }
  }, {
    selector: ".red-edge",
    style: {
      'line-color': 'red',
      'target-arrow-color': 'red',
      'source-arrow-color': 'red'
    }
  }, {
    selector: '.ghost-node',
    style: {
      'border-color': '#666666',
      'background-color': '#f5f5f5',
    }
  }
];

export { stylesheet, colors }