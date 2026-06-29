const fs = require('fs');
const path = 'scripts/verify-knockout.js';
let text = fs.readFileSync(path, 'utf8');
const before = text;
text = text.replace('Ivory Coast: { short: "CIV" }', '"Ivory Coast": { short: "CIV" }');
if (text !== before) {
  fs.writeFileSync(path, text);
  console.log('Fixed Ivory Coast quoting');
} else {
  console.log('No change needed or pattern not found');
}
