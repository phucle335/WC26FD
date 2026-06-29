const fs = require('fs');
const path = 'scripts/verify-knockout.js';
let text = fs.readFileSync(path, 'utf8');
const before = text;

// Fix Group J: Austria pts 4 (ESPN P col), Algeria pts 4
text = text.replace(
  /"Group J": \{[\s\S]*?\},\s*"Group K":/,
  `"Group J": {
        Argentina: { points: 7, gd: 3, gf: 4, played: 3 },
        Austria: { points: 4, gd: 1, gf: 4, played: 3 },
        Algeria: { points: 4, gd: -1, gf: 2, played: 3 },
        Jordan: { points: 1, gd: -3, gf: 2, played: 3 }
      },
      "Group K":`
);

// Fix Group K: Portugal pts 5, +5gd
text = text.replace(
  /"Group K": \{[\s\S]*?\},\s*"Group L":/,
  `"Group K": {
        Colombia: { points: 7, gd: 4, gf: 6, played: 3 },
        Portugal: { points: 5, gd: 5, gf: 6, played: 3 },
        "Congo DR": { points: 4, gd: -3, gf: 4, played: 3 },
        Uzbekistan: { points: 0, gd: -6, gf: 0, played: 3 }
      },
      "Group L":`
);

// Fix Group L: England 9pts, Croatia 6pts
text = text.replace(
  /"Group L": \{[\s\S]*?\}\s*\}\),/,
  `"Group L": {
        England: { points: 9, gd: 8, gf: 10, played: 3 },
        Croatia: { points: 6, gd: 2, gf: 6, played: 3 },
        Ghana: { points: 4, gd: -3, gf: 4, played: 3 },
        Panama: { points: 0, gd: -7, gf: 2, played: 3 }
      }
    }),`
);

if (text !== before) {
  fs.writeFileSync(path, text);
  console.log('Fixed Groups J, K, L');
} else {
  console.log('No changes for J-L');
}
