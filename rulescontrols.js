import { hexColorToVector, clamp, getVariable } from "./helpers.js";

// constants for game of life
const die = 0;
const stay = 1;
const birth = 2;
const both = 3;

let rulesUpToDate = false;

// constants for controls
const MIN_SCALE = 1;
const MAX_SCALE = 128;
const MIN_DELAY = 1;
const MAX_DELAY = 240;
const DEFAULT_SCALE = 4;
const DEFAULT_DELAY = 1;

// state kept for controls
let scale = DEFAULT_SCALE;
let delay = 1;

/** @type {Object<string, number[]>} */
export const rules = {
  conway: [die, die, stay, both, die, die, die, die, die],
  caves: [die, die, die, die, stay, both, both, both, both],
  highlife: [die, die, stay, both, die, die, birth, die, die]
};

/** @type {number[]} */
export let currentRules;

/** @type {CheckPair[]} */
const checkList = [];

class CheckPair {
  /**
   * adds a pair of checks to the rules table
   * @param {number} num
   */
  constructor(num) {
    this.num = num;
    const table = /** @type {HTMLTableElement} */ (document.getElementById(
      "rulestable"
    ));

    const row = table.insertRow(num + 1);

    const numberCell = row.insertCell(0);
    const deadCell = row.insertCell(1);
    const aliveCell = row.insertCell(2);

    const makeCheckbox = () => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("click", () => {
        // hack to convert pairs of booleans to int from 0 to 3
        currentRules[this.num] = this.getRuleNum();
        rulesUpToDate = false;
      });

      return checkbox;
    };

    this.deadCheckbox = makeCheckbox();
    this.aliveCheckbox = makeCheckbox();

    numberCell.innerHTML = "" + num;
    deadCell.appendChild(this.deadCheckbox);
    aliveCell.appendChild(this.aliveCheckbox);
  }

  getRuleNum() {
    return 2 * ~~this.deadCheckbox.checked + ~~this.aliveCheckbox.checked;
  }
}

/**
 * add all nine check rows to the table
 * @param {number[]} startRules
 */
export function addChecks(startRules) {
  currentRules = startRules;

  for (let i = 0; i < 9; i++) {
    const checkPair = new CheckPair(i);
    // TODO be able to set rules even outside construction
    checkList.push(checkPair);
    const booleanRules = startRules[i]
      .toString(2)
      .padStart(2, "0")
      .split("")
      .map(n => !!parseInt(n));
    checkPair.deadCheckbox.checked = booleanRules[0];
    checkPair.aliveCheckbox.checked = booleanRules[1];
  }
}

export function getRulesUpToDate() {
  return rulesUpToDate;
}

export function setRulesUpToDate(val = true) {
  rulesUpToDate = val;
}

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLUniformLocation} uYoungColor
 * @param {WebGLUniformLocation} uOldColor
 * @param {WebGLUniformLocation} uTrailColor
 * @param {WebGLUniformLocation} uDeadColor
 */
export function addColorChangeListeners(
  gl,
  uYoungColor,
  uOldColor,
  uTrailColor,
  uDeadColor
) {
  // get data from query string if any
  // example query string: `?y=ff0000&o=00ff00&t=0000ff&d=ffff00`
  const youngVar = getVariable("y");
  const youngColor = youngVar !== undefined ? "#" + youngVar : "#ffffff";
  const oldVar = getVariable("o");
  const oldColor = oldVar !== undefined ? "#" + oldVar : "#ffffff";
  const trailVar = getVariable("t");
  const trailColor = trailVar !== undefined ? "#" + trailVar : "#777777";
  const deadVar = getVariable("d");
  const deadColor = deadVar !== undefined ? "#" + deadVar : "#000000";

  const youngInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "youngcolor"
  ));

  youngInput.addEventListener(
    "change",
    makeInputFunc(gl, uYoungColor, youngInput, youngColor)
  );

  const oldInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "oldcolor"
  ));

  oldInput.addEventListener(
    "change",
    makeInputFunc(gl, uOldColor, oldInput, oldColor)
  );

  const trailInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "trailcolor"
  ));

  trailInput.addEventListener(
    "change",
    makeInputFunc(gl, uTrailColor, trailInput, trailColor)
  );

  const deadInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "deadcolor"
  ));

  deadInput.addEventListener(
    "change",
    makeInputFunc(gl, uDeadColor, deadInput, deadColor)
  );
}

/**
 * makes the on change function for a color input
 * @param {WebGLUniformLocation} loc
 * @param {HTMLInputElement} input
 * @param {WebGLRenderingContext} gl
 * @param {string} color
 */
function makeInputFunc(gl, loc, input, color) {
  input.value = color; // set initial color
  const func = () => {
    gl.uniform4fv(loc, hexColorToVector(input.value));
  };
  func(); // fire the function to set the colors
  return func;
}

export function makeRuleString() {
  let str = "";
  for (const rule of currentRules) {
    str += rule.toString(2).padStart(2, "0");
  }
  return str;
}

/**
 * add event listeners on the number fields
 * @param {HTMLCanvasElement} canvas
 */
export function addNumberChangeListeners(canvas) {
  const scaleInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "scale"
  ));

  scaleInput.addEventListener("change", () => {
    scale = clamp(parseInt(scaleInput.value), MIN_SCALE, MAX_SCALE);
    scaleInput.value = "" + scale;
    resizeCanvas(canvas);
  });

  scaleInput.min = "" + MIN_SCALE;
  scaleInput.max = "" + MAX_SCALE;

  scaleInput.value = "" + DEFAULT_SCALE;

  const delayInput = /** @type {HTMLInputElement} */ (document.getElementById(
    "delay"
  ));

  delayInput.min = "" + MIN_DELAY;
  delayInput.max = "" + MAX_DELAY;

  delayInput.value = "" + DEFAULT_DELAY;

  delayInput.addEventListener("change", () => {
    delay = clamp(parseInt(delayInput.value), MIN_DELAY, MAX_DELAY);
    delayInput.value = "" + delay;
  });

  resizeCanvas(canvas);
}

/**
 * change the canvas size
 * @param {HTMLCanvasElement} canvas
 */
function resizeCanvas(canvas) {
  canvas.style.width = canvas.width * getScale() + "px";
  canvas.style.height = canvas.height * getScale() + "px";
}

export function getScale() {
  return scale;
}

export function getDelay() {
  return delay;
}
