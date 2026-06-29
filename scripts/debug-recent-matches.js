// Test: mô phỏng lookup logic để xem vì sao "TRẬN ĐÃ ĐÁ" rỗng
const fs = require('fs');
const path = require('path');

const wc26Dir = path.resolve(__dirname, '..');
const htmlPath = path.join(wc26Dir, 'index.html');

// Trích các event từ worldcup-live-data.js
const liveDataSrc = fs.readFileSync(path.join(wc26Dir, 'worldcup-live-data.js'), 'utf8');
const liveData = (function () { const w = { window: {} }; new Function('window', `${liveDataSrc}`)(w.window); return w.window.WORLDCUP_LIVE_DATA; })();

// Trích schedule từ index.html (đoạn từ dòng 3034 trở đi)
const html = fs.readFileSync(htmlPath, 'utf8');
const schedMatch = html.match(/const schedule = (\[[\s\S]*?\n    \]);/);
if (!schedMatch) {
  console.error('Không tìm thấy schedule trong index.html');
  process.exit(1);
}
const schedule = (new Function(`return ${schedMatch[1]};`))();

// Mô phỏng canonicalName + matchKey
const aliases = {
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Cape Verde': 'Cabo Verde',
  'Congo DR': 'DR Congo',
  'Cura\u00e7ao': 'Curacao',
  'South Korea': 'Korea Republic',
  'T\u00fcrkiye': 'Turkey',
  'USA': 'United States',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina'
};
const canonical = n => aliases[n] || n;
const matchKey = (h, a, u) =>
  `${Date.parse(u)}|${[canonical(h), canonical(a)].sort().join('|')}`;

console.log(`\n=== Schedule: ${schedule.length} matches ===`);
console.log(`=== Live events: ${liveData.events.length} ===`);
console.log(`=== Finished events: ${
  liveData.events.filter(e => e.statusState === 'post' || e.completed).length
} ===\n`);

// Build lookup theo exact key
const byExact = new Map();
liveData.events.forEach(e => {
  if (!e.home || !e.away || !e.utc) return;
  byExact.set(matchKey(e.home, e.away, e.utc), e);
});

// Match với schedule
let hit = 0, miss = 0;
const missingKeys = [];
schedule.forEach(m => {
  const k = matchKey(m.home, m.away, m.utc);
  if (byExact.has(k)) hit++;
  else { miss++; missingKeys.push({ key: k, m }); }
});

console.log(`Schedule matches hit by exact lookup: ${hit}/${schedule.length}`);
console.log(`Schedule matches MISSING (no live event): ${miss}\n`);

// Trong số những match SCHEDULE có group A-L, có bao nhiêu isFinishedMatch?
const groupRe = /^Group\s+[A-L]$/i;
let finishedGroup = 0;
const samples = [];
schedule.forEach(m => {
  if (!groupRe.test(m.group || '')) return;
  const k = matchKey(m.home, m.away, m.utc);
  const ev = byExact.get(k);
  if (!ev) return;
  const isFinished = ev.statusState === 'post' || !!ev.completed;
  if (isFinished) finishedGroup++;
  else if (samples.length < 5) samples.push({ m, ev: { utc: ev.utc, status: ev.statusState, completed: ev.completed } });
});

console.log(`Group-stage matches đã đá (finished=true): ${finishedGroup}`);
console.log('\nSample group-stage match bị bỏ sót (5 đầu tiên):');
console.log(JSON.stringify(samples, null, 2));

// Recent matches theo logic recentMatches()
const recent = schedule
  .filter(m => groupRe.test(m.group || ''))
  .map(m => {
    const k = matchKey(m.home, m.away, m.utc);
    const ev = byExact.get(k);
    if (!ev) return null;
    const isFinished = ev.statusState === 'post' || !!ev.completed;
    return isFinished ? { ...m, utc: ev.utc } : null;
  })
  .filter(Boolean)
  .sort((a, b) => Date.parse(b.utc) - Date.parse(a.utc))
  .slice(0, 5);

console.log(`\nrecentMatches() sẽ trả về: ${recent.length} trận`);
recent.forEach(m => console.log(`  - ${m.group}: ${m.home} vs ${m.away} (${m.utc})`));