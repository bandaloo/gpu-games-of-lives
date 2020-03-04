import {
  addChecks,
  rules,
  getRulesUpToDate,
  currentRules,
  setRulesUpToDate,
  addColorChangeListeners,
  addNumberChangeListeners,
  getDelay,
  generateShareUrl
} from "./rulescontrols.js";

const glslify = require("glslify");

/** @type {WebGLRenderingContext} */ let gl;
/** @type {WebGLFramebuffer} */ let framebuffer;

// the programs used to simulate and render
/** @type {WebGLProgram} */ let simulationProgram;
/** @type {WebGLProgram} */ let drawProgram;

// the uniforms in the simulation shader
/** @type {WebGLUniformLocation} */ let uTime;
/** @type {WebGLUniformLocation} */ let uSimulationState;
/** @type {WebGLUniformLocation} */ let uRules;
/** @type {WebGLUniformLocation} */ let uSeed;
/** @type {WebGLUniformLocation} */ let uPaused;

// the uniforms in the render shader
/** @type {WebGLUniformLocation} */ let uYoungColor;
/** @type {WebGLUniformLocation} */ let uOldColor;
/** @type {WebGLUniformLocation} */ let uTrailColor;
/** @type {WebGLUniformLocation} */ let uDeadColor;
/** @type {WebGLTexture} */ let textureBack;
/** @type {WebGLTexture} */ let textureFront;

/** @type {{width: number, height: number}} */
let dimensions = { width: null, height: null };

// state kept for controls
let paused = false;
let justPaused = false;
let delayCount = 0;

window.onload = function() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
    "gl"
  ));
  canvas.style.imageRendering = "pixelated"; // keeps from blurring

  gl = /** @type {WebGLRenderingContext} */ (canvas.getContext("webgl2"));
  canvas.width = dimensions.width = 1920;
  canvas.height = dimensions.height = 1080;

  // game of life gui stuff
  addChecks(rules.conway);
  addNumberChangeListeners(canvas);

  // define drawing area of webgl canvas. bottom corner, width / height
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  makeBuffer();
  makeShaders();
  // seed the random number generator before render is called
  gl.uniform1f(uSeed, Math.random());
  // start the game unpaused
  gl.uniform1i(uPaused, 0);
  makeTextures(); // TODO move render out of makeTextures

  // stuff for color controls
  addColorChangeListeners(gl, uYoungColor, uOldColor, uTrailColor, uDeadColor);
  generateShareUrl();

  window.addEventListener("keypress", e => {
    console.log(e.key);
    switch (e.key) {
      case "r":
        time = 0;
        // TODO make puase and play functions
        paused = false;
        justPaused = true;
        break;
      case "p":
        paused = !paused;
        justPaused = true;
      default:
        break;
    }
  });
};

/**
 * create an alive cell at position
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
    new Uint8Array([value, 0, 0, 255])
  );
}

function makeBuffer() {
  // create a buffer object to store vertices
  const buffer = gl.createBuffer();

  // point buffer at graphic context's ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const points = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  const triangles = new Float32Array(points);

  // initialize memory for buffer and populate it. Give open gl hint contents
  // will not change dynamically
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
  drawProgram = createAndCompileFrag(fragmentSource, vertexShader);
  setPositionAndRes(drawProgram);

  const simulationSource = glslify.file("./simulation.glsl");
  simulationProgram = createAndCompileFrag(simulationSource, vertexShader);
  setPositionAndRes(simulationProgram);

  // find a pointer to the uniform "time" in our fragment shader
  uTime = gl.getUniformLocation(simulationProgram, "time");

  uSimulationState = gl.getUniformLocation(simulationProgram, "state");

  uRules = gl.getUniformLocation(simulationProgram, "rules");

  // get all the color uniforms for the render shader
  uYoungColor = gl.getUniformLocation(drawProgram, "youngColor");
  uOldColor = gl.getUniformLocation(drawProgram, "oldColor");
  uTrailColor = gl.getUniformLocation(drawProgram, "trailColor");
  uDeadColor = gl.getUniformLocation(drawProgram, "deadColor");

  // get random seed uniform location
  uSeed = gl.getUniformLocation(simulationProgram, "seed");

  // get the pause uniform location
  uPaused = gl.getUniformLocation(simulationProgram, "paused");
}

/**
 * set uniforms for resolution and set vertices to render to
 * @param {WebGLProgram} program
 */
function setPositionAndRes(program) {
  // set the resolution for the draw program to dimensions of draw buffer
  const uRes = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);

  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);

  // this will point to the vertices in the last bound array buffer. We only use
  // one array buffer, where we're storing our vertices
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

/**
 * create, compile, link and use a fragment shader
 * @param {string} source
 * @param {WebGLShader} vertexShader
 */
function createAndCompileFrag(source, vertexShader) {
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, source);
  gl.compileShader(fragmentShader);
  console.log(gl.getShaderInfoLog(fragmentShader));

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  gl.useProgram(program);
  return program;
}

function makeTextures() {
  textureBack = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureBack);

  // these two lines are needed for non-power-of-2 textures
  // TODO see if above comment still is true with webgl 2
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // how to map when texture element is less than one pixel
  // use `gl.NEAREST` to avoid linear interpolation
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

  delayCount++;
  delayCount %= getDelay();
  if (delayCount) return;

  // use our simulation shader
  gl.useProgram(simulationProgram);
  if (!getRulesUpToDate()) {
    gl.uniform1iv(uRules, new Int32Array(currentRules));
    setRulesUpToDate(true);
  }
  gl.uniform1f(uTime, time);
  // randomize the seed if simulation has just been reset
  if (time === 0) gl.uniform1f(uSeed, Math.random());
  // update the pause uniform if it has just changed
  if (justPaused) {
    justPaused = false;
    gl.uniform1i(uPaused, ~~paused);
  }
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
  // update time on CPU and GPU
  time++;
}
