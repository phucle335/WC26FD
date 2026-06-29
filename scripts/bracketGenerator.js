(function (root) {
  const bracketApi = () => root.WC26Fifa2026Bracket || {};
  const annexApi = () => root.WC26AnnexC || {};
  const thirdApi = () => root.WC26ThirdPlaceCalculator || {};

  function cloneSlot(slot) {
    return slot ? { ...slot } : null;
  }

  function buildQualificationMaps(groupStandings, thirdPlaceTable) {
    const topTwo = thirdApi().computeTopTwoByGroup(groupStandings || []);
    const winnersByGroup = {};
    const runnersByGroup = {};
    const thirdsByGroup = {};
    const groupComplete = {};
    const winnerClinchedByGroup = {};
    const winnerConfirmedByGroup = {};
    const runnerConfirmedByGroup = {};
    const thirdConfirmedByGroup = {};

    Object.keys(topTwo).forEach((g) => {
      const entry = topTwo[g] || {};
      const complete = !!entry.complete;
      groupComplete[g] = complete;
      winnerClinchedByGroup[g] = !!entry.winnerClinched;
      winnersByGroup[g] = entry.winner?.name || null;
      runnersByGroup[g] = entry.runnerUp?.name || null;
      thirdsByGroup[g] = entry.third?.name || null;
      winnerConfirmedByGroup[g] = !!entry.winner?.confirmed;
      runnerConfirmedByGroup[g] = !!entry.runnerUp?.confirmed;
      thirdConfirmedByGroup[g] = !!entry.third?.confirmed;
    });

    const rankedThirds = thirdApi().rankThirdPlacedTeams
      ? thirdApi().rankThirdPlacedTeams(groupStandings || [])
      : { bestEight: thirdPlaceTable || [], bestEightConfirmed: false, topTwo: {} };
    const bestEight = (rankedThirds.bestEight || []).length >= 8
      ? rankedThirds.bestEight
      : (thirdPlaceTable || []).slice(0, 8);
    const qualifiedThirdGroups = bestEight.map((r) => r.group).sort();
    const allGroupsComplete = Object.keys(groupComplete).length === 12
      && Object.values(groupComplete).every(Boolean);
    const thirdAssignmentConfirmed = !!rankedThirds.bestEightConfirmed
      || (allGroupsComplete && qualifiedThirdGroups.length === 8);

    if (qualifiedThirdGroups.length === 8) {
      bestEight.forEach((row) => {
        thirdsByGroup[row.group] = row.name || row.team || thirdsByGroup[row.group] || null;
      });
    }

    const thirdAssignment = qualifiedThirdGroups.length === 8 && annexApi().lookupThirdPlaceAssignment
      ? annexApi().lookupThirdPlaceAssignment(qualifiedThirdGroups)
      : null;

    return {
      winnersByGroup,
      runnersByGroup,
      thirdByGroup: thirdsByGroup,
      groupComplete,
      winnerClinchedByGroup,
      winnerConfirmedByGroup,
      runnerConfirmedByGroup,
      thirdConfirmedByGroup,
      thirdAssignment,
      thirdAssignmentConfirmed,
      allGroupsComplete,
      topTwo
    };
  }

  function resolveSlotLabel(slot, fixtureId, fixturesById) {
    if (!slot) {
      return "TBD";
    }
    if (slot.label) {
      return slot.label;
    }
    if (slot.kind === "winner") {
      const from = fixturesById?.get?.(slot.from);
      return from ? `W ${from.id}` : `W ${slot.from}`;
    }
    if (slot.kind === "loser") {
      const from = fixturesById?.get?.(slot.from);
      return from ? `L ${from.id}` : `L ${slot.from}`;
    }
    return "TBD";
  }

  function resolveSlotStatus(slot, ctx) {
    if (!slot) {
      return "slot";
    }
    if (slot.type === "team") {
      return "confirmed";
    }
    if (slot.kind === "win") {
      if (!ctx.winnersByGroup?.[slot.group]) {
        return "slot";
      }
      return ctx.winnerConfirmedByGroup?.[slot.group] ? "confirmed" : "predicted";
    }
    if (slot.kind === "run") {
      if (!ctx.runnersByGroup?.[slot.group]) {
        return "slot";
      }
      return ctx.runnerConfirmedByGroup?.[slot.group] ? "confirmed" : "predicted";
    }
    if (slot.kind === "third") {
      if (!ctx.thirdAssignment) {
        return "slot";
      }
      const winnerKey = (bracketApi().THIRD_SLOT_WINNER || {})[ctx.matchId];
      if (!winnerKey) {
        return "slot";
      }
      const group = ctx.thirdAssignment[winnerKey];
      if (!group || !ctx.thirdByGroup?.[group]) {
        return "slot";
      }
      return ctx.thirdAssignmentConfirmed && ctx.thirdConfirmedByGroup?.[group]
        ? "confirmed"
        : "predicted";
    }
    if (slot.kind === "winner") {
      return ctx.winnersByMatch?.[slot.from] ? "confirmed" : "slot";
    }
    if (slot.kind === "loser") {
      return ctx.losersByMatch?.[slot.from] ? "confirmed" : "slot";
    }
    return "slot";
  }

  function resolveSlotName(slot, ctx) {
    if (!slot) {
      return null;
    }
    if (slot.type === "team") {
      return slot.name || null;
    }
    if (slot.kind === "win") {
      return ctx.winnersByGroup?.[slot.group] || null;
    }
    if (slot.kind === "run") {
      return ctx.runnersByGroup?.[slot.group] || null;
    }
    if (slot.kind === "third") {
      if (!ctx.thirdAssignment) {
        return null;
      }
      const winnerKey = (bracketApi().THIRD_SLOT_WINNER || {})[ctx.matchId];
      if (!winnerKey) {
        return null;
      }
      const group = ctx.thirdAssignment[winnerKey];
      if (!group) {
        return null;
      }
      return ctx.thirdByGroup?.[group] || null;
    }
    if (slot.kind === "winner") {
      return ctx.winnersByMatch?.[slot.from] || null;
    }
    if (slot.kind === "loser") {
      return ctx.losersByMatch?.[slot.from] || null;
    }
    return null;
  }

  function validateThirdSlotMapping(fixture) {
    const thirdSlotWinner = bracketApi().THIRD_SLOT_WINNER || {};
    [fixture.homeSlot || fixture.home, fixture.awaySlot || fixture.away].forEach((slot) => {
      if (!slot || slot.kind !== "third") {
        return;
      }
      const mappedWinner = thirdSlotWinner[fixture.id];
      const homeWin = fixture.homeSlot?.kind === "win" ? fixture.homeSlot.group : null;
      const awayWin = fixture.awaySlot?.kind === "win" ? fixture.awaySlot.group : null;
      const opponentGroup = homeWin || awayWin;
      if (mappedWinner && opponentGroup && mappedWinner !== opponentGroup) {
        console.warn("Bracket mismatch", fixture.id, fixture.homeSlot || fixture.home, fixture.awaySlot || fixture.away);
      }
    });
  }

  function generateKnockoutBracket(groupStandings, thirdPlaceTable) {
    const maps = buildQualificationMaps(groupStandings, thirdPlaceTable);
    const fixtures = (bracketApi().getTemplateFixtures ? bracketApi().getTemplateFixtures() : []).map((fixture) => {
      const homeSlot = cloneSlot(fixture.home);
      const awaySlot = cloneSlot(fixture.away);
      const entry = {
        ...fixture,
        homeSlot,
        awaySlot
      };
      validateThirdSlotMapping(entry);
      return entry;
    });

    return {
      fixtures,
      ...maps,
      thirdAssignment: maps.thirdAssignment
    };
  }

  function verifyBracketIntegrity(bracketState) {
    const lines = [];
    const matches = (bracketState?.matches || []).filter((m) => m.round === "R32");
    matches.forEach((match) => {
      const homeSlot = match.homeSlot || match.home;
      const awaySlot = match.awaySlot || match.away;
      const expectedHome = bracketApi().getExpectedSlotLabel
        ? bracketApi().getExpectedSlotLabel(homeSlot)
        : resolveSlotLabel(homeSlot, match.id, null);
      const expectedAway = bracketApi().getExpectedSlotLabel
        ? bracketApi().getExpectedSlotLabel(awaySlot)
        : resolveSlotLabel(awaySlot, match.id, null);
      const actualHome = match.apiMatch?.homeTeam?.name || "TBD";
      const actualAway = match.apiMatch?.awayTeam?.name || "TBD";
      lines.push(`${match.id}:`);
      lines.push(`  Expected: ${expectedHome} vs ${expectedAway}`);
      lines.push(`  Actual:   ${actualHome} vs ${actualAway}`);
    });
    return lines.join("\n");
  }

  root.WC26BracketGenerator = {
    buildQualificationMaps,
    resolveSlotName,
    resolveSlotStatus,
    resolveSlotLabel,
    generateKnockoutBracket,
    verifyBracketIntegrity
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
