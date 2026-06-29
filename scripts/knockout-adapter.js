(function (root) {
  const logic = () => root.WC26Logic || {};
  const annex = () => root.WC26AnnexC || {};
  const fixturesApi = () => root.WC26KnockoutFixtures || {};
  const knockoutService = () => root.WC26EspnKnockoutService || {};
  const generator = () => root.WC26BracketGenerator || {};

  // R32 -> Vietnam Time rules (single conversion only):
  //  - Every fixture is stored in UTC (`fixture.utc`, `event.utc`).
  //  - VIETNAM time is derived once at render time via Intl.DateTimeFormat.
  //  - Never feed a formatted VN string back into new Date() — that would
  //    re-parse it in the browser's local zone and shift the time again.
  //  - The adapter only emits `matchTime` as the original UTC ISO; the UI
  //    layer (`formatBracketTime`) is the only place that localizes.

  function deepCloneSlot(slot) {
    if (!slot) return null;
    return {
      ...slot,
      groups: slot.groups ? [...slot.groups] : undefined
    };
  }

  function deepCloneFixtures(fixtures) {
    return (fixtures || []).map((f) => ({
      ...f,
      home: deepCloneSlot(f.homeSlot || f.home),
      away: deepCloneSlot(f.awaySlot || f.away),
      homeSlot: deepCloneSlot(f.homeSlot),
      awaySlot: deepCloneSlot(f.awaySlot)
    }));
  }

  function validateR32Teams(matches) {
    const r32Matches = (matches || []).filter((m) => m.round === "R32");
    const used = new Set();
    const errors = [];

    r32Matches.forEach((match) => {
      [match.apiMatch?.homeTeam?.name, match.apiMatch?.awayTeam?.name].forEach((name) => {
        if (!name || /^(1|2|3|W |L )/.test(name)) {
          return;
        }
        if (used.has(name)) {
          errors.push({
            type: "duplicate",
            team: name,
            match: match.id,
            home: match.apiMatch?.homeTeam?.name,
            away: match.apiMatch?.awayTeam?.name
          });
          console.error("Duplicate team in R32:", name, "in match:", match.id);
        }
        used.add(name);
      });
    });

    return errors;
  }

  function groupLetter(name) {
    return String(name || "").replace(/^Group\s+/i, "");
  }

  function sortedGroupRows(group, standings, schedule) {
    const rows = group.teams
      .map((teamName, index) => ({ name: teamName, ...standings[group.name][teamName], index }));
    const matches = (schedule || []).filter((match) => match.group === group.name);
    const rank = root.WC26StandingsRank;
    if (rank && typeof rank.rankGroupRows === "function") {
      return rank.rankGroupRows(rows, matches);
    }
    return rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.index - b.index);
  }

  function isGroupComplete(group, standings, schedule) {
    const rows = sortedGroupRows(group, standings, schedule);
    return rows.length > 0 && rows.every((row) => row.played >= 3);
  }

  function buildShortMaps(teamInfo) {
    const shortToName = {};
    const nameToShort = {};
    Object.keys(teamInfo || {}).forEach((name) => {
      const short = teamInfo[name]?.short;
      if (short) {
        shortToName[short] = name;
        nameToShort[name] = short;
      }
    });
    return { shortToName, nameToShort };
  }

  function getFlagUrl(teamId, teamInfo) {
    if (!teamId || teamId === "TBD" || String(teamId).startsWith("1") || String(teamId).startsWith("2") || String(teamId).startsWith("3") || String(teamId).startsWith("W ") || String(teamId).startsWith("L ")) {
      return "";
    }
    const { shortToName } = buildShortMaps(teamInfo);
    const name = shortToName[teamId] || teamId;
    const code = teamInfo[name]?.code;
    return code ? `flags/${code}.png` : "";
  }

  function qualifyTeamsFromStandings(bridge) {
    const standings = bridge.buildStandings();
    const schedule = bridge.mergeRawSchedule ? bridge.mergeRawSchedule() : [];
    const groupStandings = (bridge.groups || []).map((group) => {
      const matches = schedule.filter((match) => match.group === group.name);
      return {
      group: groupLetter(group.name),
      matches,
      teams: sortedGroupRows(group, standings, schedule).map((row) => ({
        name: row.name,
        points: row.points || 0,
        gd: row.gd || 0,
        gf: row.gf || 0,
        played: row.played || 0
      }))
    };
    });

    const thirdCalc = root.WC26ThirdPlaceCalculator || {};
    const ranked = thirdCalc.rankThirdPlacedTeams
      ? thirdCalc.rankThirdPlacedTeams(groupStandings)
      : { bestEight: [], topTwo: {} };
    const maps = generator().buildQualificationMaps
      ? generator().buildQualificationMaps(groupStandings, ranked.bestEight)
      : {
        winnersByGroup: {},
        runnersByGroup: {},
        thirdByGroup: {},
        groupComplete: {},
        winnerClinchedByGroup: {},
        winnerConfirmedByGroup: {},
        runnerConfirmedByGroup: {},
        thirdConfirmedByGroup: {},
        thirdAssignment: null,
        thirdAssignmentConfirmed: false
      };

    const allThirds = Object.keys(ranked.topTwo || {}).map((g) => {
      const third = ranked.topTwo[g]?.third;
      if (!third?.name) {
        return null;
      }
      return {
        group: g,
        team: third.name,
        points: ranked.topTwo[g]?.ranked?.[2]?.points || 0,
        gd: ranked.topTwo[g]?.ranked?.[2]?.gd || 0,
        gf: ranked.topTwo[g]?.ranked?.[2]?.gf || 0,
        confirmed: third.confirmed,
        predicted: third.predicted
      };
    }).filter(Boolean);

    return {
      first: maps.winnersByGroup,
      second: maps.runnersByGroup,
      allThirds,
      qualifyingThirds: ranked.bestEight.map((row) => ({ ...row, team: row.name })),
      annexMap: maps.thirdAssignment,
      standings,
      maps
    };
  }

  function toShortId(name, nameToShort) {
    if (!name) {
      return "TBD";
    }
    return nameToShort[name] || name.slice(0, 3).toUpperCase();
  }

  function liveEventDayKey(home, away, utc, bridge) {
    const teams = [bridge.canonicalName(home), bridge.canonicalName(away)].sort().join("|");
    return `${teams}|${new Date(utc).toISOString().slice(0, 10)}`;
  }

  function liveEventPairKey(home, away, bridge) {
    return [bridge.canonicalName(home), bridge.canonicalName(away)].sort().join("|");
  }

  function buildLiveLookups(events, bridge) {
    const prefer = logic().preferLiveEvent || ((next) => next);
    const byExact = new Map();
    const byDay = new Map();
    const byPair = new Map();

    events.forEach((event) => {
      if (!event.home || !event.away || !event.utc) {
        return;
      }
      byExact.set(bridge.matchKey(event.home, event.away, event.utc), event);
      const dayKey = liveEventDayKey(event.home, event.away, event.utc, bridge);
      if (prefer(event, byDay.get(dayKey))) {
        byDay.set(dayKey, event);
      }
      const pairKey = liveEventPairKey(event.home, event.away, bridge);
      if (prefer(event, byPair.get(pairKey))) {
        byPair.set(pairKey, event);
      }
    });

    return { byExact, byDay, byPair };
  }

  function lookupLiveEvent(home, away, utc, lookups, bridge, options = {}) {
    const exact = lookups.byExact.get(bridge.matchKey(home, away, utc));
    if (exact) {
      return exact;
    }
    if (options.knockoutOnlyExact) {
      return lookups.byExact.get(bridge.matchKey(away, home, utc)) || null;
    }
    const byDay = lookups.byDay.get(liveEventDayKey(home, away, utc, bridge));
    if (byDay) {
      return byDay;
    }
    const byPair = lookups.byPair.get(liveEventPairKey(home, away, bridge));
    if (!byPair) {
      return null;
    }
    const a = Date.parse(utc);
    const b = Date.parse(byPair.utc);
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) / 3600000 > 30) {
      return null;
    }
    return byPair;
  }

  function numberScore(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function isEspnPlaceholderTeam(name) {
    const value = String(name || "").trim();
    if (!value) {
      return true;
    }
    return /^(Third Place|Group |Round of |Quarterfinal|Winner|Loser|2nd Place|3rd )/i.test(value)
      || /\b(Winner|2nd Place|3rd Place)\b/i.test(value);
  }

  function filterKnockoutLiveEvents(events) {
    return (events || []).filter((event) => {
      if (!event?.home || !event?.away || !event?.utc) {
        return false;
      }
      return !isEspnPlaceholderTeam(event.home) && !isEspnPlaceholderTeam(event.away);
    });
  }

  function eventTeamsMatchExpected(event, expectedHome, expectedAway, bridge) {
    if (!event || !expectedHome || !expectedAway) {
      return true;
    }
    const expectedHomeName = bridge.canonicalName(expectedHome);
    const expectedAwayName = bridge.canonicalName(expectedAway);
    const eventHome = bridge.canonicalName(event.home);
    const eventAway = bridge.canonicalName(event.away);
    return (expectedHomeName === eventHome && expectedAwayName === eventAway)
      || (expectedHomeName === eventAway && expectedAwayName === eventHome);
  }

  function scoresFromEventForSlot(event, expectedHome, expectedAway, bridge) {
    const slotHome = bridge.canonicalName(expectedHome);
    const slotAway = bridge.canonicalName(expectedAway);
    const eventHome = bridge.canonicalName(event.home);
    const eventAway = bridge.canonicalName(event.away);
    const homeScore = numberScore(event.homeScore);
    const awayScore = numberScore(event.awayScore);
    if (slotHome === eventHome && slotAway === eventAway) {
      return { homeScore, awayScore };
    }
    if (slotHome === eventAway && slotAway === eventHome) {
      return { homeScore: awayScore, awayScore: homeScore };
    }
    return { homeScore: null, awayScore: null };
  }

  function isSlotLabel(name) {
    if (!name) {
      return false;
    }
    return /^(1|2|3|W |L |Group )/.test(String(name));
  }

  function enforceSlotTeamNames(apiMatch, homeName, awayName, nameToShort, homeQualStatus, awayQualStatus) {
    if (!apiMatch || !homeName || !awayName) {
      return apiMatch;
    }
    const espnHome = apiMatch.homeTeam?.name || "";
    const espnAway = apiMatch.awayTeam?.name || "";
    // Only overwrite with slot labels when ESPN returns placeholder names
    // (e.g., "3A/B/C/D/F"). Keep real team names from ESPN intact.
    if (isSlotLabel(espnHome)) {
      apiMatch.homeTeam.name = homeName;
      apiMatch.homeTeam.id = toShortId(homeName, nameToShort);
    }
    if (isSlotLabel(espnAway)) {
      apiMatch.awayTeam.name = awayName;
      apiMatch.awayTeam.id = toShortId(awayName, nameToShort);
    }
    if (homeQualStatus) {
      apiMatch.homeTeam.qualStatus = homeQualStatus;
    }
    if (awayQualStatus) {
      apiMatch.awayTeam.qualStatus = awayQualStatus;
    }
    return apiMatch;
  }

  function espnEventToApiMatch(event, fixture, bridge, nameToShort, fixturesById, expectedHome, expectedAway) {
    if (!eventTeamsMatchExpected(event, expectedHome, expectedAway, bridge)) {
      return null;
    }
    const homeName = expectedHome;
    const awayName = expectedAway;
    const { homeScore: rawH, awayScore: rawA } = scoresFromEventForSlot(event, expectedHome, expectedAway, bridge);
    const inProgress = event.statusState === "in";
    const completed = Boolean(event.completed) || event.statusState === "post";
    let status = "SCHEDULED";
    if (inProgress) {
      status = "LIVE";
    } else if (completed) {
      status = "FINISHED";
    }

    const delayed = bridge.applySpoilerDelay?.({
      home: bridge.canonicalName(homeName),
      away: bridge.canonicalName(awayName),
      utc: event.utc || fixture.utc,
      homeScore: rawH,
      awayScore: rawA,
      inProgress,
      completed,
      statusState: event.statusState || "pre",
      statusText: event.statusText || "",
      displayClock: event.displayClock || event.statusDetail || "",
      statusClock: Number(event.statusClock) || 0,
      statusPeriod: Number(event.statusPeriod) || 1,
      statusClockUpdatedAt: Number(event.statusClockUpdatedAt) || Date.now()
    }) || { homeScore: rawH, awayScore: rawA, displayClock: event.displayClock || event.statusDetail || "" };

    const h = delayed.homeScore;
    const a = delayed.awayScore;

    let winnerId = null;
    if (status === "FINISHED" && rawH !== null && rawA !== null) {
      if (rawH > rawA) {
        winnerId = toShortId(homeName, nameToShort);
      } else if (rawA > rawH) {
        winnerId = toShortId(awayName, nameToShort);
      }
    }

    const homeSlot = fixture.homeSlot || fixture.home;
    const awaySlot = fixture.awaySlot || fixture.away;
    const resolveLabel = generator().resolveSlotLabel || (() => "TBD");

    return {
      matchId: fixture.id,
      round: fixture.round,
      status,
      matchTime: event.utc || fixture.utc,
      matchClock: delayed.displayClock || event.displayClock || event.statusDetail || "",
      venue: event.venue || fixture.venue,
      matchNum: fixture.matchNum,
      homeTeam: {
        id: toShortId(homeName, nameToShort),
        name: homeName,
        slotLabel: resolveLabel(homeSlot, fixture.id, fixturesById),
        qualStatus: "confirmed",
        score: h,
        penaltyScore: null
      },
      awayTeam: {
        id: toShortId(awayName, nameToShort),
        name: awayName,
        slotLabel: resolveLabel(awaySlot, fixture.id, fixturesById),
        qualStatus: "confirmed",
        score: a,
        penaltyScore: null
      },
      winnerId
    };
  }

  function scheduledApiMatch(fixture, homeName, awayName, nameToShort, fixturesById, teamMeta = {}) {
    const homeSlot = fixture.homeSlot || fixture.home;
    const awaySlot = fixture.awaySlot || fixture.away;
    const resolveLabel = generator().resolveSlotLabel || (() => "TBD");
    const homeSlotLabel = resolveLabel(homeSlot, fixture.id, fixturesById);
    const awaySlotLabel = resolveLabel(awaySlot, fixture.id, fixturesById);
    const homeLabel = homeName || homeSlotLabel;
    const awayLabel = awayName || awaySlotLabel;
    return {
      matchId: fixture.id,
      round: fixture.round,
      status: "SCHEDULED",
      matchTime: fixture.utc,
      venue: fixture.venue,
      matchNum: fixture.matchNum,
      homeTeam: {
        id: homeName ? toShortId(homeName, nameToShort) : homeSlotLabel,
        name: homeLabel,
        slotLabel: homeSlotLabel,
        qualStatus: teamMeta.homeQualStatus || (homeName ? "predicted" : "slot"),
        score: null,
        penaltyScore: null
      },
      awayTeam: {
        id: awayName ? toShortId(awayName, nameToShort) : awaySlotLabel,
        name: awayLabel,
        slotLabel: awaySlotLabel,
        qualStatus: teamMeta.awayQualStatus || (awayName ? "predicted" : "slot"),
        score: null,
        penaltyScore: null
      },
      winnerId: null
    };
  }

  function buildMapsFromGenerated(generated, bridge) {
    if (generated?.winnersByGroup) {
      return {
        winnersByGroup: generated.winnersByGroup,
        runnersByGroup: generated.runnersByGroup,
        thirdByGroup: generated.thirdByGroup,
        groupComplete: generated.groupComplete || {},
        winnerClinchedByGroup: generated.winnerClinchedByGroup || {},
        winnerConfirmedByGroup: generated.winnerConfirmedByGroup || {},
        runnerConfirmedByGroup: generated.runnerConfirmedByGroup || {},
        thirdConfirmedByGroup: generated.thirdConfirmedByGroup || {},
        thirdAssignment: generated.thirdAssignment || null,
        thirdAssignmentConfirmed: !!generated.thirdAssignmentConfirmed,
        allGroupsComplete: !!generated.allGroupsComplete
      };
    }
    const groupStandings = generated?.groupStandings || [];
    const thirdPlaceTable = generated?.thirdPlaceTable || [];
    return generator().buildQualificationMaps
      ? generator().buildQualificationMaps(groupStandings, thirdPlaceTable)
      : qualifyTeamsFromStandings(bridge).maps;
  }

  function buildBracketState(bridge) {
    // Reset any cached bracket state stored in storage so every rebuild
    // starts from clean group standings. The previous cached payload can
    // hold phantom winners / losers from a prior render.
    if (root.WC26_RESET_KNOCKOUT_STORAGE === true) {
      try {
        root.localStorage?.removeItem?.("wc26_knockout");
        root.sessionStorage?.removeItem?.("wc26_knockout");
      } catch (_) {
        // ignore storage errors (SSR, sandboxed iframe, quota, ...)
      }
    }

    const generated = knockoutService().fetchKnockoutBracket
      ? knockoutService().fetchKnockoutBracket(bridge)
      : null;
    const fixtures = deepCloneFixtures(generated?.fixtures || fixturesApi().KNOCKOUT_FIXTURES || []);
    const maps = generated
      ? buildMapsFromGenerated(generated, bridge)
      : qualifyTeamsFromStandings(bridge).maps;

    const qualified = {
      first: maps.winnersByGroup,
      second: maps.runnersByGroup,
      allThirds: (generated?.groupStandings || [])
        .map((g) => {
          if (!maps.groupComplete?.[g.group]) {
            return null;
          }
          const third = (g.teams || [])[2];
          return third ? { group: g.group, team: third.name, points: third.points, gd: third.gd, gf: third.gf } : null;
        })
        .filter(Boolean),
      qualifyingThirds: (generated?.thirdPlaceTable || []).map((row) => ({ ...row, team: row.team || row.name })),
      annexMap: maps.thirdAssignment,
      standings: bridge.buildStandings ? bridge.buildStandings() : {},
      maps
    };

    const { nameToShort } = buildShortMaps(bridge.teamInfo);
    const events = filterKnockoutLiveEvents(bridge.getLiveEvents ? bridge.getLiveEvents() : []);
    const lookups = buildLiveLookups(events, bridge);
    const fixturesById = new Map(fixtures.map((f) => [f.id, f]));
    const resultsById = {};
    const resolveName = generator().resolveSlotName || (() => null);
    const resolveStatus = generator().resolveSlotStatus || (() => "slot");
    const resolveLabel = generator().resolveSlotLabel || (() => "TBD");

    for (let pass = 0; pass < 10; pass += 1) {
      fixtures.forEach((fixture) => {
        const winnersByMatch = {};
        const losersByMatch = {};
        Object.keys(resultsById).forEach((id) => {
          if (resultsById[id].winnerName) {
            winnersByMatch[id] = resultsById[id].winnerName;
          }
          if (resultsById[id].loserName) {
            losersByMatch[id] = resultsById[id].loserName;
          }
        });

        const ctx = {
          matchId: fixture.id,
          ...maps,
          winnersByMatch,
          losersByMatch
        };

        const homeSlot = fixture.homeSlot || fixture.home;
        const awaySlot = fixture.awaySlot || fixture.away;
        const homeName = resolveName(homeSlot, ctx);
        const awayName = resolveName(awaySlot, ctx);
        const homeQualStatus = resolveStatus(homeSlot, ctx);
        const awayQualStatus = resolveStatus(awaySlot, ctx);

        let apiMatch;
        const knockoutOnlyExact = Boolean(fixture.round);
        if (homeName && awayName) {
          let event = lookupLiveEvent(homeName, awayName, fixture.utc, lookups, bridge, { knockoutOnlyExact });
          if (event && !eventTeamsMatchExpected(event, homeName, awayName, bridge)) {
            event = null;
          }
          const fromEspn = event
            ? espnEventToApiMatch(event, fixture, bridge, nameToShort, fixturesById, homeName, awayName)
            : null;
          apiMatch = fromEspn
            ? enforceSlotTeamNames(fromEspn, homeName, awayName, nameToShort, homeQualStatus, awayQualStatus)
            : scheduledApiMatch(fixture, homeName, awayName, nameToShort, fixturesById, {
              homeQualStatus,
              awayQualStatus
            });
        } else {
          apiMatch = scheduledApiMatch(fixture, homeName, awayName, nameToShort, fixturesById, {
            homeQualStatus,
            awayQualStatus
          });
          if (!homeName) {
            apiMatch.homeTeam.name = resolveLabel(homeSlot, fixture.id, fixturesById);
            apiMatch.homeTeam.id = apiMatch.homeTeam.name;
            apiMatch.homeTeam.qualStatus = "slot";
          }
          if (!awayName) {
            apiMatch.awayTeam.name = resolveLabel(awaySlot, fixture.id, fixturesById);
            apiMatch.awayTeam.id = apiMatch.awayTeam.name;
            apiMatch.awayTeam.qualStatus = "slot";
          }
        }

        if (apiMatch.homeTeam && homeName) {
          apiMatch.homeTeam.qualStatus = homeQualStatus;
        }
        if (apiMatch.awayTeam && awayName) {
          apiMatch.awayTeam.qualStatus = awayQualStatus;
        }

        const hs = apiMatch.homeTeam.score;
        const as = apiMatch.awayTeam.score;
        let winnerName = null;
        let loserName = null;

        if (apiMatch.status === "FINISHED" && hs !== null && as !== null) {
          if (hs > as) {
            winnerName = apiMatch.homeTeam.name;
            loserName = apiMatch.awayTeam.name;
          } else if (as > hs) {
            winnerName = apiMatch.awayTeam.name;
            loserName = apiMatch.homeTeam.name;
          }
        } else if (apiMatch.winnerId) {
          winnerName = apiMatch.winnerId === apiMatch.homeTeam.id ? apiMatch.homeTeam.name : apiMatch.awayTeam.name;
          loserName = winnerName === apiMatch.homeTeam.name ? apiMatch.awayTeam.name : apiMatch.homeTeam.name;
        }

        resultsById[fixture.id] = {
          ...fixture,
          apiMatch,
          homeName,
          awayName,
          homeLabel: homeName || apiMatch.homeTeam.name,
          awayLabel: awayName || apiMatch.awayTeam.name,
          winnerName,
          loserName,
          homeTeamId: apiMatch.homeTeam.id,
          awayTeamId: apiMatch.awayTeam.id
        };
      });
    }

    // Round of 32 deduplication guard: every real team (i.e. already past
    // group stage, NOT a slot label like "1E" or "3A/B/C/D/F") must appear
    // in exactly one R32 fixture. A duplicate here means the bracket
    // generator or the live-event lookup has bled two events into the same
    // slot — throw loudly so we don't render a phantom double-entry.
    const SLOT_LABEL_PREFIX = /^[123WwLl ]/;
    const seenTeamIds = new Set();
    const seenTeamNames = new Set();
    fixtures.forEach((fixture) => {
      if (fixture.round !== "R32") {
        return;
      }
      const result = resultsById[fixture.id];
      if (!result) {
        return;
      }
      [result.homeName, result.awayName].forEach((name) => {
        if (!name || SLOT_LABEL_PREFIX.test(String(name))) {
          return;
        }
        if (seenTeamNames.has(name)) {
          throw new Error(
            `[wc26] duplicate team "${name}" in Round of 32 `
            + `(slot ${fixture.id}). Each team appears in exactly one R32 fixture.`
          );
        }
        seenTeamNames.add(name);
      });
      [result.homeTeamId, result.awayTeamId].forEach((id) => {
        if (!id || SLOT_LABEL_PREFIX.test(String(id))) {
          return;
        }
        if (seenTeamIds.has(id)) {
          throw new Error(
            `[wc26] duplicate teamId "${id}" in Round of 32 `
            + `(slot ${fixture.id}). Each team appears in exactly one R32 fixture.`
          );
        }
        seenTeamIds.add(id);
      });
    });

    const state = {
      qualified,
      matches: fixtures.map((f) => resultsById[f.id]),
      byId: resultsById,
      nameToShort
    };

    if (generator().verifyBracketIntegrity && root.WC26_DEBUG_BRACKET) {
      const report = generator().verifyBracketIntegrity(state);
      if (report) {
        console.log(report);
      }
    }

    if (root.WC26_DEBUG_BRACKET || root.WC26_VALIDATE_BRACKET) {
      const validationErrors = validateR32Teams(state.matches);
      if (validationErrors.length > 0) {
        console.error("Bracket validation failed:", validationErrors);
      }
    }

    return state;
  }

  function advanceWinners(bracketState) {
    return bracketState;
  }

  function buildApiMatchesFromBridge(bridge) {
    return buildBracketState(bridge).matches.map((m) => m.apiMatch);
  }

  function mapApiMatchesToBracketState(bridge) {
    return buildBracketState(bridge);
  }

  function createBracketPoller(bridge, onUpdate, intervalMs) {
    const ms = intervalMs || 60000;
    let timer = 0;

    async function tick() {
      try {
        if (bridge.loadLiveData) {
          await bridge.loadLiveData();
        }
      } catch (e) {
        // keep stale
      }
      onUpdate(buildBracketState(bridge));
    }

    tick();
    timer = root.setInterval(tick, ms);

    return {
      stop() {
        if (timer) {
          root.clearInterval(timer);
          timer = 0;
        }
      },
      refresh: tick
    };
  }

  function isGroupStageMatch(match) {
    return /^Group\s+[A-L]$/i.test(String(match?.group || ""));
  }

  function getGroupStageMatches(bridge) {
    if (!bridge) {
      return [];
    }
    const raw = bridge.mergeRawSchedule ? bridge.mergeRawSchedule() : (bridge.schedule || []);
    return raw.filter(isGroupStageMatch);
  }

  function isGroupStageFinished(bridge) {
    const matches = getGroupStageMatches(bridge);
    return matches.length > 0 && matches.every((m) => bridge.isFinishedMatch(m));
  }

  function getGroupStageEndTime(bridge) {
    const matches = getGroupStageMatches(bridge);
    let max = 0;
    matches.forEach((m) => {
      const t = Date.parse(m.utc);
      if (Number.isFinite(t)) {
        max = Math.max(max, t);
      }
    });
    return max || Date.parse("2026-06-28T02:00:00Z");
  }

  const KNOCKOUT_AUTO_DELAY_MS = 24 * 60 * 60 * 1000;

  function getKnockoutAutoSwitchAt(bridge) {
    return getGroupStageEndTime(bridge) + KNOCKOUT_AUTO_DELAY_MS;
  }

  function shouldAutoSwitchToKnockout(bridge, now = Date.now()) {
    return isGroupStageFinished(bridge) && now >= getKnockoutAutoSwitchAt(bridge);
  }

  function getKnockoutAutoSwitchRemainingMs(bridge, now = Date.now()) {
    if (!isGroupStageFinished(bridge)) {
      return null;
    }
    return Math.max(0, getKnockoutAutoSwitchAt(bridge) - now);
  }

  root.WC26KnockoutAdapter = {
    getFlagUrl,
    qualifyTeamsFromStandings,
    buildBracketState,
    advanceWinners,
    buildApiMatchesFromBridge,
    mapApiMatchesToBracketState,
    createBracketPoller,
    isGroupStageFinished,
    getGroupStageEndTime,
    getKnockoutAutoSwitchAt,
    shouldAutoSwitchToKnockout,
    getKnockoutAutoSwitchRemainingMs,
    KNOCKOUT_AUTO_DELAY_MS,
    toShortId,
    eventTeamsMatchExpected,
    filterKnockoutLiveEvents,
    lookupLiveEvent,
    buildLiveLookups
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
