/**
 * helper function for clamping a number
 * @param {number} n
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(n, lo));
}

/**
 * converts string given by color input to array of four (normalized)
 * @param {string} str
 */
export function hexColorToVector(str) {
  str = str.slice(1) + "ff"; // get rid of first char
  const vals = str.match(/..?/g); // split into groups of two
  const vec = vals.map(n => parseInt(n, 16) / 255);
  return vec;
}

/**
 * makes the on change function for a color input
 * @param {WebGLUniformLocation} loc
 * @param {HTMLInputElement} input
 * @param {WebGLRenderingContext} gl
 * @param {string} color
 */
export function makeInputFunc(gl, loc, input, color) {
  input.value = color; // set initial color
  const func = () => {
    gl.uniform4fv(loc, hexColorToVector(input.value));
  };
  func(); // fire the function to set the colors
  return func;
}
