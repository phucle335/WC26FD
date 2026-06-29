const fs = require('fs');
const path = 'scripts/verify-knockout.js';
let text = fs.readFileSync(path, 'utf8');
const before = text;

// Fix multi-word keys with spaces and/or hyphens that are unquoted in object literals
text = text.replace(/^(\s+)([A-Z][a-z]+(?:[ -][A-Z][a-z]+)+)(\s*:\s*\{)/gm, '$1"$2"$3');

if (text !== before) {
  fs.writeFileSync(path, text);
  console.log('Fixed multi-word keys with spaces/hyphens');
} else {
  console.log('No changes needed');
}
