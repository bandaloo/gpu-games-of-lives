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
 * gets the string value of variable from query string
 * @param {string} variable
 */
export function getVariable(variable) {
  const query = window.location.search.substring(1);
  const vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return undefined;
}
