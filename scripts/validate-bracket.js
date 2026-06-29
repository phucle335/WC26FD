(function (root) {
  function isSlotLabel(name) {
    const value = String(name || "").trim();
    if (!value || value === "TBD") {
      return true;
    }
    if (value.includes("/")) {
      return true;
    }
    if (/^(Third Place|Group |Round of |Quarterfinal|Winner|Loser|2nd Place|3rd )/i.test(value)) {
      return true;
    }
    if (/\b(Winner|2nd Place|3rd Place)\b/i.test(value)) {
      return true;
    }
    return /^[123][A-L](?:\b|\/)/.test(value)
      || /^W[\s-]/.test(value)
      || /^L[\s-]/.test(value);
  }

  function validateKnockoutBracket(bracketState) {
    const errors = [];
    const warnings = [];

    const r32Matches = (bracketState?.matches || []).filter((m) => m.round === "R32");
    const teamUsage = {};

    r32Matches.forEach((match) => {
      const home = match.apiMatch?.homeTeam?.name;
      const away = match.apiMatch?.awayTeam?.name;

      [home, away].forEach((team) => {
        if (!team || isSlotLabel(team)) return;
        if (!teamUsage[team]) teamUsage[team] = [];
        teamUsage[team].push(match.id);
      });
    });

    Object.entries(teamUsage).forEach(([team, matches]) => {
      if (matches.length > 1) {
        errors.push({
          type: "duplicate_team",
          team,
          matches,
          message: `Team "${team}" appears in ${matches.length} R32 matches: ${matches.join(", ")}`
        });
      }
    });

    (bracketState?.matches || []).forEach((match) => {
      if (!match.utc && !match.apiMatch?.matchTime) {
        warnings.push({
          type: "missing_date",
          match: match.id,
          message: `Match ${match.id} has no UTC date`
        });
      }
    });

    const roundCounts = {};
    (bracketState?.matches || []).forEach((match) => {
      roundCounts[match.round] = (roundCounts[match.round] || 0) + 1;
    });

    const expectedCounts = { R32: 16, R16: 8, QF: 4, SF: 2, F: 1, TP: 1 };
    Object.entries(expectedCounts).forEach(([round, expected]) => {
      if (roundCounts[round] && roundCounts[round] !== expected) {
        errors.push({
          type: "invalid_match_count",
          round,
          expected,
          actual: roundCounts[round],
          message: `Round ${round} has ${roundCounts[round]} matches, expected ${expected}`
        });
      }
    });

    return { errors, warnings, teamUsage };
  }

  root.WC26BracketValidator = {
    validateKnockoutBracket,
    isSlotLabel
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
