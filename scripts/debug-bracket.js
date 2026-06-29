// Debug script to verify bracket structure
(function() {
  const bracket = window.WC26Fifa2026Bracket;
  const gen = window.WC26BracketGenerator;
  
  if (!bracket || !gen) {
    console.log("Brackets not loaded");
    return;
  }
  
  const fixtures = bracket.getTemplateFixtures();
  
  console.log("=== ROUND OF 32 MATCHES ===");
  fixtures.filter(f => f.round === "R32").forEach(f => {
    const homeLabel = f.home?.label || f.home?.kind || JSON.stringify(f.home);
    const awayLabel = f.away?.label || f.away?.kind || JSON.stringify(f.away);
    console.log(`Match ${f.matchNum} (${f.id}): ${homeLabel} vs ${awayLabel} @ ${f.venue}`);
    console.log(`  UTC: ${f.utc}`);
  });
  
  console.log("\n=== ROUND OF 16 MATCHES ===");
  fixtures.filter(f => f.round === "R16").forEach(f => {
    console.log(`Match ${f.matchNum} (${f.id}): feeds=${f.feeds} @ ${f.venue}`);
    console.log(`  ${f.home?.from || '?'} vs ${f.away?.from || '?'}`);
  });
  
  console.log("\n=== BRACKET STRUCTURE CHECK ===");
  const r32 = fixtures.filter(f => f.round === "R32");
  const r16 = fixtures.filter(f => f.round === "R16");
  
  r16.forEach(r16m => {
    const feedSource = r32.filter(r => r.feeds === r16m.id);
    console.log(`${r16m.id} receives from: ${feedSource.map(f => f.id).join(', ')}`);
    
    // Check if both are group winners
    const winners = feedSource.filter(f => 
      f.home?.kind === 'win' || f.away?.kind === 'win'
    );
    console.log(`  Winner count: ${winners.length}`);
  });
})();
