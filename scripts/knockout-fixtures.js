(function (root) {
  const fifaApi = () => root.WC26Fifa2026Bracket || {};
  const genApi = () => root.WC26BracketGenerator || {};
  const fallbackIds = [
    "R32-L01", "R32-L02", "R32-L03", "R32-L04", "R32-L05", "R32-L06", "R32-L07", "R32-L08",
    "R32-R01", "R32-R02", "R32-R03", "R32-R04", "R32-R05", "R32-R06", "R32-R07", "R32-R08",
    "R16-L01", "R16-L02", "R16-L03", "R16-L04",
    "R16-R01", "R16-R02", "R16-R03", "R16-R04",
    "QF-L01", "QF-L02", "QF-R01", "QF-R02",
    "SF-L01", "SF-R01", "TP", "F"
  ];

  const THIRD_SLOT_WINNER = fifaApi().THIRD_SLOT_WINNER || {};
  let KNOCKOUT_FIXTURES = genApi().generateKnockoutBracket
    ? genApi().generateKnockoutBracket([], []).fixtures
    : (fifaApi().getTemplateFixtures ? fifaApi().getTemplateFixtures() : []);

  const KNOWN_PAIRS_FOR_TESTS = [
    ["R32-L01", "R16-L02"], ["R32-L02", "R16-L02"],
    ["R32-L03", "R16-R01"], ["R32-L04", "R16-R01"],
    ["R32-L05", "R16-L03"], ["R32-L06", "R16-L03"],
    ["R32-L07", "R16-L04"], ["R32-L08", "R16-L04"],
    ["R32-R01", "R16-L01"], ["R32-R02", "R16-R02"],
    ["R32-R03", "R16-L01"], ["R32-R04", "R16-R02"],
    ["R32-R05", "R16-R03"], ["R32-R06", "R16-R03"],
    ["R32-R07", "R16-R04"], ["R32-R08", "R16-R04"],
    ["R16-L01", "QF-L01"], ["R16-L02", "QF-L01"],
    ["R16-L03", "QF-L02"], ["R16-L04", "QF-L02"],
    ["R16-R01", "QF-R01"], ["R16-R02", "QF-R01"],
    ["R16-R03", "QF-R02"], ["R16-R04", "QF-R02"],
    ["QF-L01", "SF-L01"], ["QF-L02", "SF-L01"],
    ["QF-R01", "SF-R01"], ["QF-R02", "SF-R01"],
    ["SF-L01", "F"], ["SF-R01", "F"]
  ];

  function wingOfMatchId(id) {
    if (id === "F" || id === "TP") {
      return "center";
    }
    if (/-L\d/.test(id) || id.startsWith("QF-L")) {
      return "left";
    }
    if (/-R\d/.test(id) || id.startsWith("QF-R")) {
      return "right";
    }
    return "left";
  }

  function validateConnectorWings(pair) {
    const [from, to] = pair;
    const fw = wingOfMatchId(from);
    const tw = wingOfMatchId(to);
    if (tw === "center") {
      return true;
    }
    if (from.startsWith("R32-")) {
      return true;
    }
    if (fw !== tw) {
      throw new Error(
        `[wc26] cross-wing connector not allowed: ${from} (${fw}) -> ${to} (${tw}). `
        + "Left wing matches must feed a left QF, right wing matches must feed a right QF."
      );
    }
    return true;
  }

  function buildConnectorPairs() {
    const source = KNOCKOUT_FIXTURES.length ? KNOCKOUT_FIXTURES : KNOWN_PAIRS_FOR_TESTS.map(([id, feeds]) => ({ id, feeds }));
    const pairs = source.filter((f) => f.feeds).map((f) => [f.id, f.feeds]);
    pairs.forEach(validateConnectorWings);
    return pairs;
  }

  const CONNECTOR_PAIRS = KNOCKOUT_FIXTURES.length
    ? KNOCKOUT_FIXTURES.filter((f) => f.feeds).map((f) => [f.id, f.feeds])
    : KNOWN_PAIRS_FOR_TESTS;
  CONNECTOR_PAIRS.forEach(validateConnectorWings);

  if (!Array.isArray(KNOCKOUT_FIXTURES) || !KNOCKOUT_FIXTURES.length) {
    const feedMap = Object.fromEntries(CONNECTOR_PAIRS.map(([from, to]) => [from, to]));
    KNOCKOUT_FIXTURES = fallbackIds.map((id) => ({
      id,
      round: id.split("-")[0],
      wing: id === "TP" || id === "F" ? "center" : (/-L\d/.test(id) || /^QF-L/.test(id) ? "left" : (/-R\d/.test(id) || /^QF-R/.test(id) ? "right" : "left")),
      feeds: feedMap[id] || null
    }));
  }

  const BRACKET_COLUMN_ORDER = {
    left: {
      R32: ["R32-L01", "R32-L02", "R32-L03", "R32-L04", "R32-L05", "R32-L06", "R32-L07", "R32-L08"],
      R16: ["R16-L02", "R16-L01", "R16-L03", "R16-L04"],
      QF: ["QF-L01", "QF-L02"],
      SF: ["SF-L01"]
    },
    right: {
      R32: ["R32-R01", "R32-R02", "R32-R03", "R32-R04", "R32-R05", "R32-R06", "R32-R07", "R32-R08"],
      R16: ["R16-R01", "R16-R02", "R16-R03", "R16-R04"],
      QF: ["QF-R01", "QF-R02"],
      SF: ["SF-R01"]
    }
  };

  const WING_COLUMN_ROUNDS = {
    left: ["R32", "R16", "QF", "SF"],
    right: ["SF", "QF", "R16", "R32"]
  };

  root.WC26KnockoutFixtures = {
    KNOCKOUT_FIXTURES,
    THIRD_SLOT_WINNER,
    CONNECTOR_PAIRS,
    BRACKET_COLUMN_ORDER,
    WING_COLUMN_ROUNDS,
    buildConnectorPairs,
    wingOfMatchId,
    validateConnectorWings
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
