const glslify = require("glslify");

// constants for game of life;
const stay = 0;
const both = 1;
const birth = 2;
const die = 3;

let setRules = false;

/** @type {Object<string, number[]>} */
const rules = {
  conway: [die, die, stay, both, die, die, die, die, die],
  caves: [die, die, die, die, stay, both, both, both, both],
  highlife: [die, die, stay, both, die, die, birth, die, die]
};

/** @type {WebGLRenderingContext} */
let gl;

/** @type {WebGLFramebuffer} */
let framebuffer;

/** @type {WebGLProgram} */
let simulationProgram;

/** @type {WebGLProgram} */
let drawProgram;

/** @type {WebGLUniformLocation} */
let uTime;

/** @type {WebGLUniformLocation} */
let uSimulationState;

/** @type {WebGLUniformLocation} */
let uRules;

/** @type {WebGLTexture} */
let textureBack;

/** @type {WebGLTexture} */
let textureFront;

/** @type {{width: number, height: number}} */
let dimensions = { width: null, height: null };

window.onload = function() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
    "gl"
  ));

  gl = /** @type {WebGLRenderingContext} */ (canvas.getContext("webgl2"));
  canvas.width = dimensions.width = window.innerWidth;
  canvas.height = dimensions.height = window.innerHeight;

  // define drawing area of webgl canvas. bottom corner, width / height
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  makeBuffer();
  makeShaders();
  makeTextures();
  setInitialState();
};

/**
 * @param {number} x
 * @param {number} y
 * @param {number} value
 * @param {WebGLTexture} texture
 */
function poke(x, y, value, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    // x offset, y offset, width, height
    x,
    y,
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    // is supposed to be a typed array
    new Uint8Array([value, value, value, 255])
  );
}

function setInitialState() {
  for (let i = 0; i < dimensions.width; i++) {
    for (let j = 0; j < dimensions.height; j++) {
      if (Math.random() > 0.5) {
        poke(i, j, 255, textureBack);
      }
    }
  }
}

function makeBuffer() {
  // create a buffer object to store vertices
  const buffer = gl.createBuffer();

  // point buffer at graphic context's ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const points = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  const triangles = new Float32Array(points);

  // initialize memory for buffer and populate it. Give
  // open gl hint contents will not change dynamically.
  gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
}

function makeShaders() {
  // create vertex shader
  const vertexSource = glslify.file("./vertex.glsl");
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);

  // create fragment shader
  const fragmentSource = glslify.file("./render.glsl");
  const drawFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(drawFragmentShader, fragmentSource);
  gl.compileShader(drawFragmentShader);
  console.log(gl.getShaderInfoLog(drawFragmentShader));

  // create render program that draws to screen
  drawProgram = gl.createProgram();
  gl.attachShader(drawProgram, vertexShader);
  gl.attachShader(drawProgram, drawFragmentShader);

  gl.linkProgram(drawProgram);
  gl.useProgram(drawProgram);

  const uResDraw = gl.getUniformLocation(drawProgram, "resolution");
  gl.uniform2f(uResDraw, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // get position attribute location in shader
  let position = gl.getAttribLocation(drawProgram, "a_position");
  // enable the attribute
  gl.enableVertexAttribArray(position);

  // this will point to the vertices in the last bound array buffer. In this
  // example, we only use one array buffer, where we're storing our vertices
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const simulationSource = glslify.file("./simulation.glsl");
  const simulationFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(simulationFragmentShader, simulationSource);
  gl.compileShader(simulationFragmentShader);
  console.log(gl.getShaderInfoLog(simulationFragmentShader));

  // create simulation program
  simulationProgram = gl.createProgram();
  gl.attachShader(simulationProgram, vertexShader);
  gl.attachShader(simulationProgram, simulationFragmentShader);

  gl.linkProgram(simulationProgram);
  gl.useProgram(simulationProgram);

  const uResSimulation = gl.getUniformLocation(simulationProgram, "resolution");
  gl.uniform2f(uResSimulation, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // find a pointer to the uniform "time" in our fragment shader
  uTime = gl.getUniformLocation(simulationProgram, "time");

  uSimulationState = gl.getUniformLocation(simulationProgram, "state");

  uRules = gl.getUniformLocation(simulationProgram, "rules");

  position = gl.getAttribLocation(simulationProgram, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

function makeTextures() {
  textureBack = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureBack);

  // these two lines are needed for non-power-of-2 textures
  // TODO see if above comment still is true with webgl 2
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // how to map when texture element is less than one pixel
  // use gl.NEAREST to avoid linear interpolation
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  // how to map when texture element is more than one pixel
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // specify texture format, see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  textureFront = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  // Create a framebuffer and attach the texture.
  framebuffer = gl.createFramebuffer();

  // textures loaded, now ready to render
  render();
}

// keep track of time via incremental frame counter
let time = 0;
function render() {
  // schedules render to be called the next time the video card requests
  // a frame of video
  window.requestAnimationFrame(render);

  // use our simulation shader
  gl.useProgram(simulationProgram);
  if (!setRules) {
    setUpRules(rules.conway);
  }
  // update time on CPU and GPU
  time++;
  gl.uniform1f(uTime, time);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  // use the framebuffer to write to our texFront texture
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textureFront,
    0
  );
  // set viewport to be the size of our state (game of life simulation)
  // here, this represents the size that will be drawn onto our texture
  gl.viewport(0, 0, dimensions.width, dimensions.height);

  // in our shaders, read from texBack, which is where we poked to
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureBack);
  gl.uniform1i(uSimulationState, 0);
  // run shader
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // swap our front and back textures
  let tmp = textureFront;
  textureFront = textureBack;
  textureBack = tmp;

  // use the default framebuffer object by passing null
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // set our viewport to be the size of our canvas
  // so that it will fill it entirely
  gl.viewport(0, 0, dimensions.width, dimensions.height);
  // select the texture we would like to draw to the screen.
  // note that webgl does not allow you to write to / read from the
  // same texture in a single render pass. Because of the swap, we're
  // displaying the state of our simulation ****before**** this render pass (frame)
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  // use our drawing (copy) shader
  gl.useProgram(drawProgram);
  // put simulation on screen
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * set the uniform defining the rules of the game
 * @param {number[]} ruleset
 */
function setUpRules(ruleset) {
  gl.uniform1iv(uRules, new Int32Array(ruleset));
  setRules = true;
}
