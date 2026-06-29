const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "knockout-annex-c-source.mjs"), "utf8");
const winnersMatch = src.match(/export const ANNEX_C_WINNERS = (\[[^\]]+\])/);
const rowsMatch = src.match(/export const ANNEX_C_ROWS = (\[[\s\S]*?\]);/);

if (!winnersMatch || !rowsMatch) {
  console.error("Failed to parse annex source");
  process.exit(1);
}

const winners = eval(winnersMatch[1]);
const rows = eval(rowsMatch[1]);

const out = `(function (root) {
  const ANNEX_C_WINNERS = ${JSON.stringify(winners)};
  const ANNEX_C_ROWS = ${JSON.stringify(rows)};
  const LOOKUP = new Map();

  for (let i = 0; i < ANNEX_C_ROWS.length; i++) {
    const letters = ANNEX_C_ROWS[i];
    const byWinner = {};
    for (let j = 0; j < ANNEX_C_WINNERS.length; j++) {
      byWinner[ANNEX_C_WINNERS[j]] = letters[j];
    }
    LOOKUP.set(letters.split("").sort().join(""), byWinner);
  }

  function lookupThirdPlaceAssignment(qualifyingGroups) {
    const combo = qualifyingGroups.slice().sort().join("");
    return LOOKUP.get(combo) || null;
  }

  root.WC26AnnexC = {
    ANNEX_C_WINNERS,
    ANNEX_C_ROWS,
    lookupThirdPlaceAssignment
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

fs.writeFileSync(path.join(__dirname, "knockout-annex-c.js"), out);
console.log("Wrote knockout-annex-c.js", rows.length, "rows");
