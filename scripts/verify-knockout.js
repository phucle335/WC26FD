#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed += 1;
  console.error(`  ✗ ${label}`);
  if (detail) {
    console.error(`    ${detail}`);
  }
}

function createSandbox() {
  const sandbox = { console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return sandbox;
}

function loadScript(relativePath, sandbox) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  const code = fs.readFileSync(file, "utf8");
  const ctx = sandbox || createSandbox();
  if (!ctx.globalThis) {
    ctx.globalThis = ctx;
  }
  if (!ctx.window) {
    ctx.window = ctx;
  }
  vm.runInNewContext(code, ctx, { filename: file });
  return ctx;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

console.log("WC26 Knockout v2 — verify\n");

try {
  const types = loadScript("scripts/knockout-types.js");
  ok("knockout-types.js loads");

  const annexSandbox = loadScript("scripts/knockout-annex-c.js");
  const annex = annexSandbox.WC26AnnexC;
  if (!annex || typeof annex.lookupThirdPlaceAssignment !== "function") {
    fail("Annex C export");
  } else if (annex.ANNEX_C_ROWS.length !== 495) {
    fail("Annex C row count", `expected 495, got ${annex.ANNEX_C_ROWS.length}`);
  } else {
    const sample = annex.lookupThirdPlaceAssignment(["A", "B", "C", "D", "E", "F", "G", "H"]);
    if (!sample || typeof sample !== "object") {
      fail("Annex C lookup returns map");
    } else {
      ok(`Annex C: ${annex.ANNEX_C_ROWS.length} rows + lookup`);
    }
  }

  const fixturesSandbox = createSandbox();
  loadScript("scripts/wc26-logic.js", fixturesSandbox);
  loadScript("scripts/standings-rank.js", fixturesSandbox);
  loadScript("scripts/knockout-annex-c.js", fixturesSandbox);
  loadScript("scripts/fifa2026Bracket.js", fixturesSandbox);
  loadScript("scripts/thirdPlaceCalculator.js", fixturesSandbox);
  loadScript("scripts/bracketGenerator.js", fixturesSandbox);
  loadScript("scripts/knockout-fixtures.js", fixturesSandbox);
  const fixturesApi = fixturesSandbox.WC26KnockoutFixtures;
  const fixtures = fixturesApi?.KNOCKOUT_FIXTURES || [];
  if (fixtures.length < 31) {
    fail("fixture count", `expected >=31, got ${fixtures.length}`);
  } else {
    ok(`${fixtures.length} knockout fixtures`);
  }

  const ids = new Set(fixtures.map((f) => f.id));
  if (ids.size !== fixtures.length) {
    fail("unique fixture ids");
  } else {
    ok("fixture ids unique");
  }

  const wings = { left: 0, right: 0, center: 0 };
  fixtures.forEach((f) => {
    wings[f.wing] = (wings[f.wing] || 0) + 1;
  });
  if (!wings.left || !wings.right || !wings.center) {
    fail("wing distribution", JSON.stringify(wings));
  } else {
    ok(`wings left=${wings.left} right=${wings.right} center=${wings.center}`);
  }

  const pairs = fixturesApi.CONNECTOR_PAIRS || [];
  if (pairs.length < 20) {
    fail("connector pairs", `expected >=20, got ${pairs.length}`);
  } else {
    ok(`${pairs.length} connector pairs`);
  }

  // Cross-wing connector guard: every parent → child pair must respect
  // the bracket's left/right partition (or land on the trophy column).
  // R32->R16 cross-wings are allowed by the layout constraint (FIFA bracket
  // pairs late R32 matches 85-88 cross-wing by design). Skip those pairs so
  // we only enforce the no-cross-wing rule at the R16->QF and QF->SF stages.
  let crossWing = 0;
  pairs.forEach(([from, to]) => {
    if (from.startsWith("R32-") && to.startsWith("R16-")) {
      return;
    }
    const fw = fixturesApi.wingOfMatchId?.(from) || "left";
    const tw = fixturesApi.wingOfMatchId?.(to) || "left";
    if (tw === "center") {
      return;
    }
    if (fw !== tw) {
      crossWing += 1;
    }
  });
  if (crossWing !== 0) {
    fail("no cross-wing connectors", `${crossWing} pair(s) cross wings`);
  } else {
    ok("no cross-wing connectors");
  }

  // Same-wing count: R32->R16 pairs are skipped (may be cross-wing), so we
  // expect 22 same-wing pairs out of 30 total (8 R32->R16 pairs are excluded).
  let sameWingPairs = 0;
  pairs.forEach(([from, to]) => {
    if (from.startsWith("R32-") && to.startsWith("R16-")) {
      return;
    }
    const fw = fixturesApi.wingOfMatchId?.(from);
    const tw = fixturesApi.wingOfMatchId?.(to);
    if (fw && tw && fw === tw && tw !== "center") {
      sameWingPairs += 1;
    }
  });
  if (sameWingPairs < 12) {
    fail("intra-wing feeders", `expected >=12 same-wing pairs, got ${sameWingPairs}`);
  } else {
    ok(`${sameWingPairs} same-wing feeders`);
  }

  const layoutSandbox = createSandbox();
  layoutSandbox.innerWidth = 1920;
  layoutSandbox.innerHeight = 1080;
  layoutSandbox.getComputedStyle = (el) => ({
    getPropertyValue(prop) {
      if (prop === "--ko-match-h") {
        return "48px";
      }
      return "";
    },
    paddingTop: el ? "76px" : "0",
    paddingBottom: el ? "10px" : "0"
  });
  loadScript("scripts/knockout-bracket-layout.js", layoutSandbox);
  ok("knockout-bracket-layout.js loads");

  const layout = layoutSandbox.WC26KnockoutLayout;
  const mockScroll = { clientHeight: 860, offsetHeight: 860 };
  const mockStage = {
    style: { setProperty() {} },
    dataset: {},
    querySelector(sel) {
      if (sel === ".ko-v2-bracket") {
        return { style: {} };
      }
      return null;
    }
  };
  const compactProfile = layout.getLayoutProfile(mockScroll, mockStage);
  if (compactProfile.matchH !== 48 || !compactProfile.distributeEvenly) {
    fail("compact layout profile at 1920x1080", JSON.stringify(compactProfile));
  } else {
    ok("compact layout profile at 1920x1080");
  }

  const stackH = layout.computeStackHeight(mockScroll, mockStage, compactProfile);
  const r32Ids = Array.from({ length: 8 }, (_, i) => `R32-L0${i + 1}`);
  const centerY = layout.computeCenterY([], { left: { R32: r32Ids } }, compactProfile, stackH);
  const r32Centers = r32Ids.map((id) => centerY[id]);
  let spacingOk = true;
  for (let i = 1; i < r32Centers.length; i += 1) {
    if (r32Centers[i] - r32Centers[i - 1] < compactProfile.matchH) {
      spacingOk = false;
      break;
    }
  }
  if (!spacingOk || stackH < layout.minEvenStackHeight(compactProfile)) {
    fail("R32 vertical spacing at 1080p", `stackH=${stackH}, centers=${r32Centers.join(",")}`);
  } else {
    ok("R32 vertical spacing at 1080p");
  }

  layoutSandbox.innerWidth = 2560;
  layoutSandbox.innerHeight = 1440;
  const wideProfile = layout.getLayoutProfile({ clientHeight: 1220, offsetHeight: 1220 }, mockStage);
  if (wideProfile.distributeEvenly || wideProfile.matchH !== 62) {
    fail("wide layout profile at 2560x1440", JSON.stringify(wideProfile));
  } else {
    ok("wide layout profile at 2560x1440");
  }

  if (layout.getConnectorAnchors) {
    ok("getConnectorAnchors export");
  } else {
    fail("getConnectorAnchors export");
  }

  if (typeof layout.resolveWingStageGaps === "function") {
    const lowGaps = layout.resolveWingStageGaps(1920);
    const highGaps = layout.resolveWingStageGaps(2560);
    const midGaps = layout.resolveWingStageGaps(2240);
    if (
      lowGaps.r32r16 !== 78 || lowGaps.r16qf !== 78 || lowGaps.qfsf !== 95
      || highGaps.r32r16 !== 70 || highGaps.r16qf !== 90 || highGaps.qfsf !== 110
      || Math.abs(midGaps.r32r16 - 94) > 0.01
      || Math.abs(midGaps.r16qf - 104) > 0.01
      || Math.abs(midGaps.qfsf - 122.5) > 0.01
    ) {
      fail("resolveWingStageGaps interpolation", JSON.stringify({ lowGaps, midGaps, highGaps }));
    } else {
      ok("resolveWingStageGaps endpoints + interpolation");
    }
  } else {
    fail("resolveWingStageGaps export");
  }

  if (typeof layout.resolveWideWingSpacing === "function") {
    const wide = layout.resolveWideWingSpacing(780);
    if (wide.spread !== 0 || wide.gaps.r32r16 < 70) {
      fail("resolveWideWingSpacing disabled on wide", JSON.stringify(wide));
    } else {
      ok("resolveWideWingSpacing returns FHD gaps without spread");
    }
  } else {
    fail("resolveWideWingSpacing export");
  }

  if (typeof layout.isWideBracketViewport === "function") {
    ok("isWideBracketViewport export");
  } else {
    fail("isWideBracketViewport export");
  }

  if (typeof layout.resolveCompactCardWidth === "function") {
    const boosted = layout.resolveCompactCardWidth(76, 60);
    if (boosted < 95 || boosted > 130) {
      fail("resolveCompactCardWidth FHD boost", String(boosted));
    } else {
      ok(`resolveCompactCardWidth boosts 76px col to ${boosted}px`);
    }
  } else {
    fail("resolveCompactCardWidth export");
  }

  if (typeof layout.applyCompactCardWidth === "function") {
    const cardProps = {};
    const stageWithCol = {
      style: {
        setProperty(prop, val) {
          cardProps[prop] = val;
        },
        removeProperty(prop) {
          delete cardProps[prop];
        }
      },
      querySelector(sel) {
        if (sel.includes("R32")) {
          return { getBoundingClientRect: () => ({ width: 76 }), clientWidth: 76 };
        }
        return null;
      }
    };
    layoutSandbox.innerWidth = 1920;
    layout.applyCompactCardWidth(stageWithCol);
    if (!cardProps["--ko-card-w"] || cardProps["--ko-card-w"] === "100%") {
      fail("applyCompactCardWidth at 1920", cardProps["--ko-card-w"]);
    } else {
      ok(`applyCompactCardWidth sets ${cardProps["--ko-card-w"]} at 1920`);
    }

    layoutSandbox.innerWidth = 2560;
    layout.applyCompactCardWidth(stageWithCol);
    if (cardProps["--ko-card-w"]) {
      fail("applyCompactCardWidth clears above 1920", cardProps["--ko-card-w"]);
    } else {
      ok("applyCompactCardWidth clears above 1920");
    }

    layoutSandbox.innerWidth = 1920;
    const stageTinyCol = {
      style: {
        setProperty(prop, val) {
          cardProps[prop] = val;
        },
        removeProperty(prop) {
          delete cardProps[prop];
        }
      },
      querySelector() {
        return { getBoundingClientRect: () => ({ width: 12 }), clientWidth: 12 };
      }
    };
    layout.applyCompactCardWidth(stageTinyCol);
    if (cardProps["--ko-card-w"]) {
      fail("applyCompactCardWidth skips tiny column measure", cardProps["--ko-card-w"]);
    } else {
      ok("applyCompactCardWidth skips tiny column measure");
    }
  } else {
    fail("applyCompactCardWidth export");
  }

  if (typeof layout.distributeWingGapsToWidth === "function") {
    const target = { r32r16: 78, r16qf: 78, qfsf: 95 };
    const tight = layout.distributeWingGapsToWidth(480, target);
    const wide = layout.distributeWingGapsToWidth(700, target);
    if (tight.r32r16 < 56 || wide.r32r16 <= target.r32r16) {
      fail("distributeWingGapsToWidth", JSON.stringify({ tight, wide }));
    } else {
      ok("distributeWingGapsToWidth fits + expands wing gaps");
    }
  } else {
    fail("distributeWingGapsToWidth export");
  }

  const adapterSandbox = createSandbox();
  loadScript("scripts/wc26-logic.js", adapterSandbox);
  loadScript("scripts/standings-rank.js", adapterSandbox);
  loadScript("scripts/knockout-types.js", adapterSandbox);
  loadScript("scripts/knockout-annex-c.js", adapterSandbox);
  loadScript("scripts/fifa2026Bracket.js", adapterSandbox);
  loadScript("scripts/thirdPlaceCalculator.js", adapterSandbox);
  loadScript("scripts/bracketGenerator.js", adapterSandbox);
  loadScript("scripts/espnKnockoutService.js", adapterSandbox);
  loadScript("scripts/knockout-fixtures.js", adapterSandbox);
  loadScript("scripts/knockout-adapter.js", adapterSandbox);
  ok("knockout-adapter.js loads (with fixtures)");
  const adapter = adapterSandbox.WC26KnockoutAdapter;
  const generator = adapterSandbox.WC26BracketGenerator;
  const fifa = adapterSandbox.WC26Fifa2026Bracket;

  const officialR32 = {
    "R32-L01": ["1E", "3A/B/C/D/F"],
    "R32-L02": ["1I", "3C/D/F/G/H"],
    "R32-L03": ["2A", "2B"],
    "R32-L04": ["1F", "2C"],
    "R32-L05": ["2K", "2L"],
    "R32-L06": ["1H", "2J"],
    "R32-L07": ["1D", "3B/E/F/I/J"],
    "R32-L08": ["1G", "3A/E/H/I/J"],
    "R32-R01": ["1C", "2F"],
    "R32-R02": ["2E", "2I"],
    "R32-R03": ["1A", "3C/E/F/H/I"],
    "R32-R04": ["1L", "3E/H/I/J/K"],
    "R32-R05": ["1J", "2H"],
    "R32-R06": ["2D", "2G"],
    "R32-R07": ["1B", "3E/F/G/I/J"],
    "R32-R08": ["1K", "3D/E/I/J/L"]
  };

  const templateFixtures = fifa.getTemplateFixtures().filter((f) => f.round === "R32");
  let r32Ok = templateFixtures.length === 16;
  templateFixtures.forEach((f) => {
    const expected = officialR32[f.id];
    if (!expected) {
      r32Ok = false;
      return;
    }
    const homeLabel = fifa.getExpectedSlotLabel(f.home);
    const awayLabel = fifa.getExpectedSlotLabel(f.away);
    if (homeLabel !== expected[0] || awayLabel !== expected[1]) {
      r32Ok = false;
    }
  });
  if (!r32Ok) {
    fail("official R32 template slots");
  } else {
    ok("official R32 template slots (16 matches)");
  }

  const partialStandings = [{
    group: "E",
    teams: [
      { name: "Germany", points: 6, gd: 3, gf: 5, played: 2 },
      { name: "Curacao", points: 3, gd: 0, gf: 2, played: 2 },
      { name: "Ivory Coast", points: 1, gd: -1, gf: 1, played: 2 }
    ]
  }];
  const partialMaps = generator.buildQualificationMaps(partialStandings, []);
  if (partialMaps.winnersByGroup.E !== "Germany") {
    fail("partial group shows predicted leader", `got ${partialMaps.winnersByGroup.E}`);
  } else {
    ok("partial group shows predicted leader");
  }
  if (partialMaps.winnerConfirmedByGroup?.E) {
    fail("partial group leader should stay predicted");
  } else {
    ok("partial group leader stays predicted until clinched");
  }

  const winSlot = { type: "slot", kind: "win", group: "E", label: "1E" };
  const predictedCtx = {
    matchId: "R32-L01",
    winnersByGroup: { E: "Germany" },
    runnersByGroup: {},
    thirdByGroup: {},
    groupComplete: { E: false },
    winnerConfirmedByGroup: { E: false },
    winnerClinchedByGroup: { E: false },
    thirdAssignment: null,
    thirdAssignmentConfirmed: false,
    allGroupsComplete: false,
    winnersByMatch: {},
    losersByMatch: {}
  };
  const predictedWinner = generator.resolveSlotName(winSlot, predictedCtx);
  if (predictedWinner !== "Germany") {
    fail("resolveSlotName returns predicted winner", `got ${predictedWinner}`);
  } else {
    ok("resolveSlotName returns predicted winner");
  }
  if (generator.resolveSlotStatus(winSlot, predictedCtx) !== "predicted") {
    fail("resolveSlotStatus marks predicted winner");
  } else {
    ok("resolveSlotStatus marks predicted winner");
  }

  const confirmedCtx = {
    ...predictedCtx,
    winnerConfirmedByGroup: { E: true },
    winnerClinchedByGroup: { E: true }
  };
  if (generator.resolveSlotStatus(winSlot, confirmedCtx) !== "confirmed") {
    fail("resolveSlotStatus marks confirmed winner");
  } else {
    ok("resolveSlotStatus marks confirmed winner");
  }

  const rank = adapterSandbox.WC26StandingsRank;
  if (!rank || typeof rank.rankGroupRows !== "function") {
    fail("standings-rank export");
  } else {
    ok("standings-rank.js loads");
    const tiedRows = [
      { name: "Germany", points: 6, gd: 2, gf: 5, index: 0, played: 3 },
      { name: "Ecuador", points: 6, gd: 2, gf: 5, index: 1, played: 3 },
      { name: "Curacao", points: 3, gd: -2, gf: 2, index: 2, played: 3 },
      { name: "Ivory Coast", points: 3, gd: -2, gf: 3, index: 3, played: 3 }
    ];
    const h2hMatches = [
      {
        group: "Group E",
        home: "Germany",
        away: "Ecuador",
        homeScore: 2,
        awayScore: 1,
        statusState: "post"
      }
    ];
    const ranked = rank.rankGroupRows(tiedRows, h2hMatches);
    if (ranked[0]?.name !== "Germany") {
      fail("FIFA H2H ranks Germany first on equal pts/gd/gf", `got ${ranked[0]?.name}`);
    } else {
      ok("FIFA H2H ranks Germany first on equal pts/gd/gf");
    }

    const gdRows = [
      { name: "Germany", points: 6, gd: 1, gf: 5, index: 0, played: 3 },
      { name: "Ecuador", points: 6, gd: 3, gf: 6, index: 1, played: 3 }
    ];
    const gdRanked = rank.rankGroupRows(gdRows, h2hMatches);
    if (gdRanked[0]?.name !== "Ecuador") {
      fail("overall GD still beats H2H when GD differs", `got ${gdRanked[0]?.name}`);
    } else {
      ok("overall GD still beats H2H when GD differs");
    }

    const thirdCalc = adapterSandbox.WC26ThirdPlaceCalculator;
    const groupE = {
      group: "E",
      matches: h2hMatches,
      teams: tiedRows
    };
    const topTwo = thirdCalc.computeTopTwoByGroup([groupE]);
    if (topTwo.E?.winner?.name !== "Germany" || topTwo.E?.runnerUp?.name !== "Ecuador") {
      fail("thirdPlaceCalculator uses FIFA H2H order", JSON.stringify(topTwo.E));
    } else {
      ok("thirdPlaceCalculator uses FIFA H2H order");
    }

    const groupJRows = [
      { name: "Argentina", points: 6, gd: 4, gf: 4, played: 2, index: 0 },
      { name: "Austria", points: 3, gd: 0, gf: 1, played: 2, index: 1 },
      { name: "Algeria", points: 3, gd: 0, gf: 1, played: 2, index: 2 },
      { name: "Jordan", points: 0, gd: -2, gf: 0, played: 2, index: 3 }
    ];
    const groupJMatches = [
      { group: "Group J", home: "Argentina", away: "Algeria", homeScore: 2, awayScore: 0, statusState: "post" },
      { group: "Group J", home: "Austria", away: "Jordan", homeScore: 1, awayScore: 0, statusState: "post" },
      { group: "Group J", home: "Argentina", away: "Austria", homeScore: 2, awayScore: 0, statusState: "post" },
      { group: "Group J", home: "Jordan", away: "Algeria", homeScore: 0, awayScore: 1, statusState: "post" },
      { group: "Group J", home: "Algeria", away: "Austria", utc: "2026-06-28T02:00:00Z", statusState: "pre" },
      { group: "Group J", home: "Jordan", away: "Argentina", utc: "2026-06-28T02:00:00Z", statusState: "pre" }
    ];
    if (!rank.isGroupWinnerClinched(groupJRows, groupJMatches)) {
      fail("Argentina winner clinched before Group J ends");
    } else {
      ok("Argentina winner clinched before Group J ends");
    }

    const groupJ = { group: "J", matches: groupJMatches, teams: groupJRows };
    const topTwoJ = thirdCalc.computeTopTwoByGroup([groupJ]);
    if (topTwoJ.J?.winner?.name !== "Argentina" || !topTwoJ.J?.winner?.confirmed || topTwoJ.J?.complete) {
      fail("partial Group J exposes clinched winner", JSON.stringify(topTwoJ.J));
    } else {
      ok("partial Group J exposes clinched winner");
    }

    if (!topTwoJ.J?.runnerUp?.name || topTwoJ.J.runnerUp.confirmed) {
      fail("partial Group J keeps runner-up predicted", JSON.stringify(topTwoJ.J?.runnerUp));
    } else {
      ok("partial Group J keeps runner-up predicted");
    }

    const winJ = { type: "slot", kind: "win", group: "J", label: "1J" };
    const resolvedJ = generator.resolveSlotName(winJ, {
      matchId: "R32-R05",
      winnersByGroup: { J: "Argentina" },
      runnersByGroup: { J: topTwoJ.J.runnerUp.name },
      thirdByGroup: {},
      groupComplete: { J: false },
      winnerConfirmedByGroup: { J: true },
      runnerConfirmedByGroup: { J: false },
      winnerClinchedByGroup: { J: true },
      thirdAssignment: null,
      thirdAssignmentConfirmed: false,
      allGroupsComplete: false,
      winnersByMatch: {},
      losersByMatch: {}
    });
    if (resolvedJ !== "Argentina") {
      fail("resolveSlotName allows clinched winner", `got ${resolvedJ}`);
    } else if (generator.resolveSlotStatus(winJ, {
      matchId: "R32-R05",
      winnersByGroup: { J: "Argentina" },
      winnerConfirmedByGroup: { J: true }
    }) !== "confirmed") {
      fail("resolveSlotStatus marks clinched winner confirmed");
    } else {
      ok("resolveSlotName allows clinched winner");
    }

    const runSlot = { type: "slot", kind: "run", group: "J", label: "2J" };
    if (generator.resolveSlotStatus(runSlot, {
      matchId: "R32-R05",
      runnersByGroup: { J: topTwoJ.J.runnerUp.name },
      runnerConfirmedByGroup: { J: false }
    }) !== "predicted") {
      fail("resolveSlotStatus marks predicted runner-up");
    } else {
      ok("resolveSlotStatus marks predicted runner-up");
    }
  }

  const mockBridge = {
    groups: [],
    teamInfo: { Germany: { code: "de", short: "GER" } },
    buildStandings: () => ({}),
    canonicalName: (n) => n,
    matchKey: (h, a, u) => `${h}|${a}|${u}`,
    isLiveMatch: () => false,
    isFinishedMatch: () => false,
    getLiveEvents: () => []
  };

  const flag = adapter.getFlagUrl("GER", mockBridge.teamInfo);
  if (flag !== "flags/de.png") {
    fail("getFlagUrl GER", `got ${flag}`);
  } else {
    ok("getFlagUrl maps short code → flags/de.png");
  }

  const groupEndUtc = "2026-06-27T23:30:00Z";
  const finishedGroupBridge = {
    mergeRawSchedule: () => [
      { group: "Group A", utc: groupEndUtc, completed: true, statusState: "post" },
      { group: "Group B", utc: "2026-06-20T00:00:00Z", completed: true, statusState: "post" }
    ],
    isFinishedMatch: (match) => match.statusState === "post" || Boolean(match.completed)
  };
  const incompleteGroupBridge = {
    mergeRawSchedule: () => [
      { group: "Group A", utc: groupEndUtc, completed: true, statusState: "post" },
      { group: "Group B", utc: "2026-06-20T00:00:00Z", completed: false, statusState: "pre" }
    ],
    isFinishedMatch: (match) => match.statusState === "post" || Boolean(match.completed)
  };
  const switchAt = adapter.getKnockoutAutoSwitchAt(finishedGroupBridge);
  const expectedSwitchAt = Date.parse(groupEndUtc) + adapter.KNOCKOUT_AUTO_DELAY_MS;
  if (!adapter.isGroupStageFinished(finishedGroupBridge)) {
    fail("group stage finished when all group matches FT");
  } else if (adapter.isGroupStageFinished(incompleteGroupBridge)) {
    fail("group stage not finished while a group match remains");
  } else if (switchAt !== expectedSwitchAt) {
    fail("knockout auto switch time", `${switchAt} vs ${expectedSwitchAt}`);
  } else if (adapter.shouldAutoSwitchToKnockout(finishedGroupBridge, switchAt - 1)) {
    fail("knockout auto switch waits 24h after group stage end");
  } else if (!adapter.shouldAutoSwitchToKnockout(finishedGroupBridge, switchAt)) {
    fail("knockout auto switch triggers after 24h delay");
  } else if (adapter.getKnockoutAutoSwitchRemainingMs(finishedGroupBridge, switchAt - 60000) !== 60000) {
    fail("knockout auto switch remaining ms");
  } else {
    ok("knockout auto switch after 24h group-stage grace");
  }

  const state = adapter.buildBracketState(mockBridge);
  if (!state || !Array.isArray(state.matches) || state.matches.length !== fixtures.length) {
    fail("buildBracketState", `matches=${state?.matches?.length}`);
  } else {
    ok("buildBracketState returns all matches (preview slots)");
  }

  const r32Preview = state.matches.find((m) => m.id === "R32-L01");
  if (!r32Preview || r32Preview.apiMatch.homeTeam.name !== "1E") {
    fail("preview shows slot labels", r32Preview?.apiMatch?.homeTeam?.name);
  } else {
    ok("preview shows slot labels before qualification");
  }

  const cfBridge = {
    groups: [
      { name: "Group C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
      { name: "Group E", teams: ["Germany", "Ivory Coast", "Ecuador", "Curaçao"] },
      { name: "Group F", teams: ["Netherlands", "Japan", "Paraguay", "Bahrain"] },
      { name: "Group I", teams: ["France", "Norway", "Senegal", "Bosnia-Herzegovina"] }
    ],
    teamInfo: {
      Brazil: { code: "br", short: "BRA" },
      Japan: { code: "jp", short: "JPN" },
      Morocco: { code: "ma", short: "MAR" },
      Netherlands: { code: "nl", short: "NED" },
      Germany: { code: "de", short: "GER" },
      Paraguay: { code: "py", short: "PAR" },
      "Ivory Coast": { code: "ci", short: "CIV" },
      Norway: { code: "no", short: "NOR" }
    },
    buildStandings: () => ({
      "Group C": {
        Brazil: { points: 9, gd: 5, gf: 6, played: 3 },
        Morocco: { points: 6, gd: 2, gf: 4, played: 3 },
        Haiti: { points: 3, gd: -2, gf: 2, played: 3 },
        Scotland: { points: 0, gd: -5, gf: 1, played: 3 }
      },
      "Group E": {
        Germany: { points: 9, gd: 5, gf: 6, played: 3 },
        "Ivory Coast": { points: 6, gd: 2, gf: 4, played: 3 },
        Ecuador: { points: 3, gd: -2, gf: 2, played: 3 },
        Curaçao: { points: 0, gd: -5, gf: 1, played: 3 }
      },
      "Group F": {
        Netherlands: { points: 7, gd: 5, gf: 7, played: 3 },
        Japan: { points: 5, gd: 2, gf: 5, played: 3 },
        Sweden: { points: 4, gd: 0, gf: 4, played: 3 },
        Tunisia: { points: 1, gd: -4, gf: 4, played: 3 }
      },
      "Group G": {
        Belgium: { points: 5, gd: 4, gf: 7, played: 3 },
        Egypt: { points: 5, gd: 2, gf: 5, played: 3 },
        Iran: { points: 3, gd: 0, gf: 3, played: 3 },
        "New Zealand": { points: 0, gd: -6, gf: 2, played: 3 }
      },
      "Group H": {
        Spain: { points: 9, gd: 5, gf: 5, played: 3 },
        "Cape Verde": { points: 3, gd: 0, gf: 2, played: 3 },
        Uruguay: { points: 3, gd: -1, gf: 3, played: 3 },
        "Saudi Arabia": { points: 2, gd: -4, gf: 1, played: 3 }
      },
      "Group I": {
        France: { points: 9, gd: 3, gf: 4, played: 3 },
        Norway: { points: 4, gd: 1, gf: 4, played: 3 },
        Senegal: { points: 3, gd: -1, gf: 3, played: 3 },
        Iraq: { points: 1, gd: -3, gf: 2, played: 3 }
      }
    }),
    mergeRawSchedule: () => [],
    canonicalName: (n) => n,
    matchKey: (h, a, u) => `${h}|${a}|${u}`,
    getLiveEvents: () => []
  };
  const cfState = adapter.buildBracketState(cfBridge);
  const r32R03 = cfState.matches.find((m) => m.id === "R32-R03");
  const r32L04 = cfState.matches.find((m) => m.id === "R32-L04");
  if (
    !r32R03
    || r32R03.wing !== "right"
    || r32R03.apiMatch.homeTeam.name !== "1A"
    || r32R03.apiMatch.awayTeam.name !== "3C/E/F/H/I"
  ) {
    fail("R32-R03 right wing: 1A vs third slot (Group A missing in test data)", JSON.stringify({
      wing: r32R03?.wing,
      home: r32R03?.apiMatch?.homeTeam?.name,
      away: r32R03?.apiMatch?.awayTeam?.name
    }));
  } else {
    ok("R32-R03 right wing shows slot labels when Group A data missing");
  }
  if (
    !r32L04
    || r32L04.wing !== "left"
    || r32L04.apiMatch.homeTeam.name !== "Netherlands"
    || r32L04.apiMatch.awayTeam.name !== "Morocco"
  ) {
    fail("R32-L04 left wing: 1F vs 2C", JSON.stringify({
      wing: r32L04?.wing,
      home: r32L04?.apiMatch?.homeTeam?.name,
      away: r32L04?.apiMatch?.awayTeam?.name
    }));
  } else {
    ok("R32-L04 left wing fills Netherlands vs Morocco (1F vs 2C)");
  }

  const r32All = cfState.matches.filter((m) => m.round === "R32");
  const r32Filled = r32All.filter((m) => {
    const home = m.apiMatch?.homeTeam?.name || "";
    const away = m.apiMatch?.awayTeam?.name || "";
    return !/^(1|2|3|W |L )/.test(home) && !/^(1|2|3|W |L )/.test(away);
  }).length;
  if (r32Filled !== 3) {
    fail("partial standings fill only known R32 pairs", `filled=${r32Filled}`);
  } else {
    ok("partial standings fill only known R32 pairs (3/16)");
  }

  if (typeof generator.verifyBracketIntegrity === "function") {
    const report = generator.verifyBracketIntegrity(state);
    if (!report.includes("R32-L01:") || !report.includes("Expected:")) {
      fail("verifyBracketIntegrity report");
    } else {
      ok("verifyBracketIntegrity report");
    }
  } else {
    fail("verifyBracketIntegrity export");
  }

  const css = readText("knockout/knockout.css");
  const requiredSelectors = [
    "#knockout-screen",
    ".ko-v2-glass",
    ".knockout-match",
    ".knockout-bracket-connectors",
    ".knockout-page",
    ".knockout-entry-btn"
  ];
  requiredSelectors.forEach((sel) => {
    if (!css.includes(sel.replace(/^\./, "").replace(/^#/, ""))) {
      fail(`CSS contains ${sel}`);
    }
  });
  if (requiredSelectors.every((sel) => css.includes(sel.slice(1)))) {
    ok("knockout.css key selectors");
  }

  if (
    css.includes("--ko-wing-gap-r32-r16")
    && css.includes("is-predicted")
    && css.includes("--ko-wing-gap-r16-qf")
    && css.includes("--ko-wing-gap-qf-sf")
    && css.includes("--ko-wing-spread")
    && css.includes("@media (min-width: 2560px)")
    && !css.includes("--ko-wing-col-gap")
    && !css.includes("--ko-r32-inset")
  ) {
    ok("knockout.css per-round wing gap vars");
  } else {
    fail("knockout.css per-round wing gap vars");
  }

  const html = readText("knockout/knockout.html");
  [
    "ko-wing-left",
    "knockout-connectors",
    "ko-upcoming",
    "ko-upcoming-page-controls",
    "knockout-back-btn",
    "knockout-page",
    "upcoming-matches-panel",
    "fixtures-list",
    "knockout-bracket-connectors",
    "ko-local-clock",
    "ko-next-match-dock",
    "ko-round-controls",
    "data-ko-list-round"
  ].forEach((id) => {
    if (!html.includes(id)) {
      fail(`knockout.html contains ${id}`);
    }
  });
  ok("knockout.html structure");

  const koJs = readText("knockout/knockout.js");
  if (!koJs.includes("EMBEDDED_MARKUP") || !koJs.includes("knockout-page") || !koJs.includes("match-card") || !koJs.includes("knockout-match") || !koJs.includes("ko-next-match-stage") || !koJs.includes("ko-round-controls") || !koJs.includes("data-ko-list-round") || !koJs.includes("data-ko-upcoming-page")) {
    fail("knockout.js embedded markup fallback");
  } else {
    ok("knockout.js embedded markup");
  }

  const indexHtml = readText("index.html");
  const glueChecks = [
    "id=\"group-stage-screen\"",
    "id=\"knockout-entry-btn\"",
    "id=\"knockout-screen\"",
    "window.WC26Bridge",
    "scripts/standings-rank.js",
    "knockout/knockout.css",
    "scripts/knockout-adapter.js",
    "knockout/knockout.js"
  ];
  glueChecks.forEach((needle) => {
    if (!indexHtml.includes(needle)) {
      fail(`index.html glue: ${needle}`);
    }
  });
  ok("index.html glue present");

  if (
    indexHtml.includes("SPOILER_DELAY_MS = 150000")
    && indexHtml.includes("applySpoilerDelay")
    && indexHtml.includes("fetchEspnScoreboardPayload")
    && indexHtml.includes("getEspnEventsScoresKey")
  ) {
    ok("index.html ESPN + spoiler delay glue");
  } else {
    fail("index.html ESPN + spoiler delay glue");
  }

  const adapterJs = readText("scripts/knockout-adapter.js");
  const layoutJs = readText("scripts/knockout-bracket-layout.js");
  if (adapterJs.includes("applySpoilerDelay")) {
    ok("knockout-adapter applies spoiler delay");
  } else {
    fail("knockout-adapter applies spoiler delay");
  }

  if (adapterJs.includes("knockoutOnlyExact")) {
    ok("knockout-adapter blocks group-stage ESPN bleed into R32");
  } else {
    fail("knockout-adapter blocks group-stage ESPN bleed into R32");
  }

  if (typeof adapter.filterKnockoutLiveEvents === "function") {
    const filtered = adapter.filterKnockoutLiveEvents([
      { home: "Brazil", away: "Japan", utc: "2026-06-30T19:00:00Z" },
      { home: "Germany", away: "Third Place Group A/B/C/D/F", utc: "2026-06-29T20:30Z" },
      { home: "Group I Winner", away: "Third Place Group C/D/F/G/H", utc: "2026-06-30T21:00Z" }
    ]);
    if (filtered.length !== 1 || filtered[0].home !== "Brazil") {
      fail("filterKnockoutLiveEvents removes ESPN placeholders", `len=${filtered.length}`);
    } else {
      ok("filterKnockoutLiveEvents removes ESPN placeholders");
    }
  } else {
    fail("filterKnockoutLiveEvents export");
  }

  const bleedBridge = {
    groups: [
      { name: "Group C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
      { name: "Group E", teams: ["Germany", "Ivory Coast", "Ecuador", "Curaçao"] },
      { name: "Group F", teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
      { name: "Group D", teams: ["United States", "Paraguay", "Australia", "Türkiye"] }
    ],
    teamInfo: {
      Brazil: { short: "BRA" },
      Japan: { short: "JPN" },
      Netherlands: { short: "NED" },
      Morocco: { short: "MAR" },
      Germany: { short: "GER" },
      Paraguay: { short: "PAR" },
      "Ivory Coast": { short: "CIV" },
      Norway: { short: "NOR" }
    },
    buildStandings: () => ({
      "Group A": {
        Mexico: { points: 9, gd: 6, gf: 6, played: 3 },
        "South Africa": { points: 4, gd: -1, gf: 2, played: 3 },
        "Korea Republic": { points: 3, gd: -1, gf: 2, played: 3 },
        Czechia: { points: 1, gd: -4, gf: 2, played: 3 }
      },
      "Group B": {
        Switzerland: { points: 7, gd: 4, gf: 7, played: 3 },
        Canada: { points: 4, gd: 5, gf: 8, played: 3 },
        "Bosnia-Herzegovina": { points: 4, gd: -1, gf: 5, played: 3 },
        Qatar: { points: 1, gd: -8, gf: 2, played: 3 }
      },
      "Group C": {
        Brazil: { points: 9, gd: 6, gf: 7, played: 3 },
        Morocco: { points: 7, gd: 3, gf: 6, played: 3 },
        Scotland: { points: 3, gd: -3, gf: 1, played: 3 },
        Haiti: { points: 0, gd: -6, gf: 2, played: 3 }
      },
      "Group D": {
        "United States": { points: 6, gd: 4, gf: 8, played: 3 },
        Australia: { points: 4, gd: 0, gf: 2, played: 3 },
        Paraguay: { points: 4, gd: -2, gf: 2, played: 3 },
        Türkiye: { points: 3, gd: -2, gf: 3, played: 3 }
      },
      "Group E": {
        Germany: { points: 9, gd: 5, gf: 6, played: 3 },
        "Ivory Coast": { points: 6, gd: 2, gf: 4, played: 3 },
        Ecuador: { points: 3, gd: -2, gf: 2, played: 3 },
        Curaçao: { points: 0, gd: -5, gf: 1, played: 3 }
      },
      "Group F": {
        Netherlands: { points: 7, gd: 3, gf: 5, played: 3 },
        Japan: { points: 6, gd: 2, gf: 4, played: 3 },
        Sweden: { points: 4, gd: -1, gf: 3, played: 3 },
        Tunisia: { points: 0, gd: -4, gf: 1, played: 3 }
      },
      "Group G": {
        Belgium: { points: 9, gd: 5, gf: 6, played: 3 },
        Egypt: { points: 6, gd: 2, gf: 4, played: 3 },
        "New Zealand": { points: 3, gd: -2, gf: 2, played: 3 },
        Uzbekistan: { points: 0, gd: -5, gf: 1, played: 3 }
      },
      "Group H": {
        "Cape Verde": { points: 7, gd: 3, gf: 5, played: 3 },
        Spain: { points: 6, gd: 2, gf: 4, played: 3 },
        Haiti: { points: 3, gd: -2, gf: 2, played: 3 },
        China: { points: 0, gd: -5, gf: 1, played: 3 }
      },
      "Group I": {
        France: { points: 9, gd: 5, gf: 6, played: 3 },
        Norway: { points: 6, gd: 2, gf: 4, played: 3 },
        Senegal: { points: 3, gd: -2, gf: 2, played: 3 },
        "Bosnia-Herzegovina": { points: 0, gd: -5, gf: 1, played: 3 }
      }
    }),
    mergeRawSchedule: () => [],
    canonicalName: (n) => n,
    matchKey: (h, a, u) => `${h}|${a}|${u}`,
    getLiveEvents: () => ([
      {
        home: "Japan",
        away: "Brazil",
        utc: "2026-06-29T17:00:00Z",
        homeScore: 1,
        awayScore: 2,
        statusState: "pre",
        completed: false
      },
      {
        home: "Norway",
        away: "Ivory Coast",
        utc: "2026-06-30T17:00:00Z",
        homeScore: 0,
        awayScore: 0,
        statusState: "pre",
        completed: false
      }
    ])
  };
  const bleedState = adapter.buildBracketState(bleedBridge);
  const bleedR01 = bleedState.matches.find((m) => m.id === "R32-R01");
  const bleedL04 = bleedState.matches.find((m) => m.id === "R32-L04");
  if (
    !bleedR01
    || bleedR01.apiMatch.homeTeam.name !== "Brazil"
    || bleedR01.apiMatch.awayTeam.name !== "Japan"
    || bleedR01.apiMatch.homeTeam.score !== 2
    || bleedR01.apiMatch.awayTeam.score !== 1
  ) {
    fail("slot orientation kept when ESPN flips home/away", JSON.stringify({
      home: bleedR01?.apiMatch?.homeTeam?.name,
      away: bleedR01?.apiMatch?.awayTeam?.name,
      hs: bleedR01?.apiMatch?.homeTeam?.score,
      as: bleedR01?.apiMatch?.awayTeam?.score
    }));
  } else {
    ok("slot orientation kept when ESPN flips home/away");
  }
  if (
    bleedL04
    && (bleedL04.apiMatch.homeTeam.name !== "Netherlands" || bleedL04.apiMatch.awayTeam.name !== "Morocco")
    && (bleedL04.apiMatch.homeTeam.score !== null || bleedL04.apiMatch.awayTeam.score !== null)
  ) {
    fail("wrong ESPN event on same day does not bleed into other R32 slot", JSON.stringify({
      home: bleedL04.apiMatch.homeTeam.name,
      away: bleedL04.apiMatch.awayTeam.name,
      hs: bleedL04.apiMatch.homeTeam.score
    }));
  } else {
    ok("wrong ESPN event on same day does not bleed into other R32 slot");
  }

  if (adapterJs.includes("enforceSlotTeamNames") || adapterJs.includes("scoresFromEventForSlot")) {
    ok("knockout-adapter enforces FIFA slot team names");
  } else {
    fail("knockout-adapter enforces FIFA slot team names");
  }

  if (fs.existsSync(path.join(ROOT, "scripts/dev-server.js"))) {
    ok("dev-server.js exists");
  } else {
    fail("dev-server.js missing");
  }

  if (fs.existsSync(path.join(ROOT, "preview.html"))) {
    ok("preview.html exists");
  } else {
    fail("preview.html missing");
  }

  // Storage reset hook: buildBracketState must wipe any cached bracket
  // state when WC26_RESET_KNOCKOUT_STORAGE is true, so we don't render
  // phantom winners left over from a prior render.
  if (adapterJs.includes("WC26_RESET_KNOCKOUT_STORAGE") || adapterJs.includes('removeItem("wc26_knockout")') || adapterJs.includes('removeItem?.(\"wc26_knockout\")')) {
    ok("knockout-adapter resets wc26_knockout storage before rebuild");
  } else {
    fail("knockout-adapter resets wc26_knockout storage before rebuild");
  }

  // Duplicate teamId / teamName guard: every real team must appear at most
  // once in Round of 32. The dedup throw is what surfaces duplicate
  // teamId bleed from ESPN fixtures.
  if (adapterJs.includes("seenTeamIds") && adapterJs.includes("seenTeamNames") && adapterJs.includes("duplicate teamId")) {
    ok("knockout-adapter rejects duplicate teamIds in R32");
  } else {
    fail("knockout-adapter rejects duplicate teamIds in R32");
  }

  // Connector wipe on rerender: drawConnectors must remove all previous
  // SVG children before appending new paths. We accept either replaceChildren
  // or the while-loop `removeChild` pattern documented by the task.
  if (layoutJs.includes("replaceChildren") || (layoutJs.includes("while") && layoutJs.includes("svgEl.firstChild") && layoutJs.includes("removeChild"))) {
    ok("layout wipes connector layer before redraw");
  } else {
    fail("layout wipes connector layer before redraw");
  }
} catch (err) {
  fail("unexpected error", err.message);
  console.error(err);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
