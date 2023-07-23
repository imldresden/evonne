// see all @ https://github.com/cytoscape/cytoscape.js-cola

const params = {
  name: 'cola',
  
  animate: true,
  animationDuration: 500,
  fit: true,

  randomize: false,  
  nodeSpacing: 5,
  centerGraph: true,
  maxSimulationTime: 2000,

  flow: {
    axis: 'x',
    minSeparation: 30,
  },

  /*
  edgeLength: undefined,
  edgeSymDiffLength: undefined,
  edgeJaccardLength: undefined,
  */

  padding: 30,
  nodeDimensionsIncludeLabels: true,
};

export { params };
