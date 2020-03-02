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
 *
 * @param {string} str
 */
export function hexColorToVector(str) {
  str = str.slice(1) + "ff"; // get rid of first char
  const vals = str.match(/..?/g); // split into groups of two
  const vec = vals.map(n => parseInt(n, 16) / 255);
  console.log(vec);
  return vec;
}
