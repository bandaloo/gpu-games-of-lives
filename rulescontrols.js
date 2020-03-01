// constants for game of life
const die = 0;
const stay = 1;
const birth = 2;
const both = 3;

let rulesUpToDate = false;

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
        currentRules[this.num] =
          2 * ~~this.deadCheckbox.checked + ~~this.aliveCheckbox.checked;
        rulesUpToDate = false;
        console.log(currentRules);
      });

      console.log(currentRules);

      return checkbox;
    };

    this.deadCheckbox = makeCheckbox();
    this.aliveCheckbox = makeCheckbox();

    numberCell.innerHTML = "" + num;
    deadCell.appendChild(this.deadCheckbox);
    aliveCell.appendChild(this.aliveCheckbox);
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
