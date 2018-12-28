let canvas = document.getElementById("canvas");
const regl = require('regl')(canvas);
const glslify = require('glslify');
const mat4 = require('gl-mat4');
const createCanvasOrbitCamera = require('canvas-orbit-camera');
let d3 = Object.assign({}, 
  require("d3-scale"),
  require("d3-scale-chromatic"),
  require("d3-color"),
  require("d3-selection"),
  require("d3-interpolate"),
  require("d3-ease")
);

let canvasCamera = createCanvasOrbitCamera(canvas);

const cubePrimitive = require('./primitives/cube.js');

const numCubesInRow = 55;
const heightScale = d3.scaleLinear().domain([0,1]).range([0.001, 5.0]);
const colorScale = d3.interpolateRainbow;

let interpTime = 1.0;
let timeLastFrame = 0.0;
const timeFactor = 0.5;
const maxDelay = 0.6;

// class combines all data and functions relevant to a cube
const makeCube = (_index, _datum1, _datum2) => {
  let index = _index
  let datum1 = _datum1;
  let datum2 = _datum2;

  let colorInterp = d3.interpolate(colorScale(_datum1),colorScale(_datum1));
  let heightInterp = d3.interpolate(heightScale(_datum2),heightScale(_datum2));

  const xPos = index % numCubesInRow - numCubesInRow/2;
  const yPos = Math.floor(index/numCubesInRow) - numCubesInRow/2;

  const delay = (_index/numCubes) * maxDelay;

  const _drawCube = regl({
    vert: glslify('./shaders/basic-mesh.vs.glsl'),
    frag: glslify('./shaders/basic-color.fs.glsl'),
    attributes: {
      position: cubePrimitive.positions,
    },
    elements: cubePrimitive.elements,
    uniforms: {
      modelView: regl.prop('modelView'),
      projection: regl.prop('projection'),
      color: regl.prop('color')
    }
  });

  const drawCube = (view, projection, t) => {
    // start pre-drawing math
    t = Math.max(t-delay,0);
    t /= 1-maxDelay;
    t = Math.min(t,1.0)
    let color = colorInterp(t);
    let height = heightInterp(t);
    let model = mat4.translate([], mat4.create(), [xPos, yPos, height/2]);
    model = mat4.scale([],model, [1.0, 1.0, height]);
    let modelView = mat4.multiply([], view, model);

    // basic regl draw call
    _drawCube({
      modelView: modelView,
      projection: projection,
      color: Object.values(d3.color(color)).map( (d,i) => {  return (i < 3 ? d/255 : d); } )
    });
  };

  const updateData = (_datum1, _datum2) => {
    datum1 = _datum1;
    datum2 = _datum2;

    colorInterp = d3.interpolate(colorInterp(1.0), colorScale(_datum1));
    heightInterp = d3.interpolate(heightInterp(1.0), heightScale(_datum2));
  };

  return {
    drawCube: drawCube,
    updateData: updateData
  };
}

// introduce a pattern into the color datum
const makeDatum = (index, numCubesInRow) => {
  return Math.min(Math.random() + Math.random() * (index/numCubes), 1.0);
}

// construct initial cubes
const numCubes = numCubesInRow * numCubesInRow;
let cubes = [];
for (let i = 0 ; i < numCubes ; i++) {
  cubes.push( makeCube(i, makeDatum(i), Math.random()) );
}

regl.frame(function(context) {
  let view = canvasCamera.view();
  canvasCamera.tick();

  let projection = mat4.perspective([],
    Math.PI / 4,
    context.viewportWidth / context.viewportHeight,
    1,
  1e3)

  // global interpolation state
  if(interpTime < 1.0) {
    interpTime += (context.time - timeLastFrame) * timeFactor;
    interpTime = Math.min(1.0, interpTime)
  }
  timeLastFrame = context.time;

  cubes.forEach( (cube,i) => {
    cube.drawCube(view, projection, d3.easeQuad(interpTime));
  });
});

// reroll the data
let updateData = () => {
  cubes.forEach( (cube,i) => cube.updateData(makeDatum(i), Math.random()) );
  interpTime = 0.0;
}
d3.select("#button").on("click", () => { updateData(); } );
