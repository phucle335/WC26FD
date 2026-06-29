const fs = require('fs');
const path = 'scripts/verify-knockout.js';
let text = fs.readFileSync(path, 'utf8');
const before = text;

// Fix all groups F-L with correct ESPN data
// ESPN columns: GP|W|D|L|F|A|GD|P
// Test uses: points, gd, gf

text = text.replace(
  /"Group F": \{[\s\S]*?\},\s*"Group G":/,
  `"Group F": {
        Netherlands: { points: 7, gd: 5, gf: 7, played: 3 },
        Japan: { points: 5, gd: 2, gf: 5, played: 3 },
        Sweden: { points: 4, gd: 0, gf: 4, played: 3 },
        Tunisia: { points: 1, gd: -4, gf: 4, played: 3 }
      },
      "Group G":`
);

text = text.replace(
  /"Group G": \{[\s\S]*?\},\s*"Group H":/,
  `"Group G": {
        Belgium: { points: 5, gd: 4, gf: 7, played: 3 },
        Egypt: { points: 5, gd: 2, gf: 5, played: 3 },
        Iran: { points: 3, gd: 0, gf: 3, played: 3 },
        "New Zealand": { points: 0, gd: -6, gf: 2, played: 3 }
      },
      "Group H":`
);

text = text.replace(
  /"Group H": \{[\s\S]*?\},\s*"Group I":/,
  `"Group H": {
        Spain: { points: 9, gd: 5, gf: 5, played: 3 },
        "Cape Verde": { points: 3, gd: 0, gf: 2, played: 3 },
        Uruguay: { points: 3, gd: -1, gf: 3, played: 3 },
        "Saudi Arabia": { points: 2, gd: -4, gf: 1, played: 3 }
      },
      "Group I":`
);

text = text.replace(
  /"Group I": \{[\s\S]*?\}\s*\}\),/,
  `"Group I": {
        France: { points: 9, gd: 3, gf: 4, played: 3 },
        Norway: { points: 4, gd: 1, gf: 4, played: 3 },
        Senegal: { points: 3, gd: -1, gf: 3, played: 3 },
        Iraq: { points: 1, gd: -3, gf: 2, played: 3 }
      }
    }),`
);

if (text !== before) {
  fs.writeFileSync(path, text);
  console.log('Fixed Groups F, G, H, I');
} else {
  console.log('No changes for F-I');
}
