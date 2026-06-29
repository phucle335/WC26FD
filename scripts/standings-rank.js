(function (root, factory) {
  const api = factory(root.WC26Logic || {});
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.WC26StandingsRank = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (logic) {
  const canonicalName = logic.canonicalName || ((name) => name);
  const getStandingsScores = logic.getStandingsScores || null;
  const isFinishedMatch = logic.isFinishedMatch || null;

  function normalizeTeamName(name) {
    return canonicalName(name);
  }

  function getFinishedMatchScores(match) {
    if (getStandingsScores) {
      return getStandingsScores(match);
    }
    if (match.homeScore === null || match.homeScore === undefined
      || match.awayScore === null || match.awayScore === undefined) {
      return null;
    }
    return { home: match.homeScore, away: match.awayScore };
  }

  function isGroupMatchFinished(match) {
    if (isFinishedMatch) {
      return isFinishedMatch(match);
    }
    return match.statusState === "post" || !!match.completed;
  }

  function comparePrimary(a, b) {
    return (b.points || 0) - (a.points || 0)
      || (b.gd || 0) - (a.gd || 0)
      || (b.gf || 0) - (a.gf || 0);
  }

  function miniLeagueTable(teamNames, matches) {
    const names = teamNames.map(normalizeTeamName);
    const set = new Set(names);
    const stats = {};

    names.forEach((name) => {
      stats[name] = { points: 0, gf: 0, ga: 0, gd: 0 };
    });

    (matches || []).forEach((match) => {
      if (!isGroupMatchFinished(match)) {
        return;
      }

      const home = normalizeTeamName(match.home);
      const away = normalizeTeamName(match.away);
      if (!set.has(home) || !set.has(away)) {
        return;
      }

      const scores = getFinishedMatchScores(match);
      if (!scores) {
        return;
      }

      const homeScore = scores.home;
      const awayScore = scores.away;
      stats[home].gf += homeScore;
      stats[home].ga += awayScore;
      stats[away].gf += awayScore;
      stats[away].ga += homeScore;

      if (homeScore > awayScore) {
        stats[home].points += 3;
      } else if (homeScore < awayScore) {
        stats[away].points += 3;
      } else {
        stats[home].points += 1;
        stats[away].points += 1;
      }
    });

    Object.values(stats).forEach((row) => {
      row.gd = row.gf - row.ga;
    });

    return stats;
  }

  function compareMiniStats(statsA, statsB) {
    return (statsB.points - statsA.points)
      || (statsB.gd - statsA.gd)
      || (statsB.gf - statsA.gf);
  }

  function miniStatsKey(stats) {
    return `${stats.points}|${stats.gd}|${stats.gf}`;
  }

  function compareFairPlay(a, b) {
    const fairA = a.fairPlay ?? a.fairPlayPoints ?? 0;
    const fairB = b.fairPlay ?? b.fairPlayPoints ?? 0;
    if (fairB !== fairA) {
      return fairB - fairA;
    }
    const indexA = a.index ?? 0;
    const indexB = b.index ?? 0;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return String(a.name || "").localeCompare(String(b.name || ""));
  }

  function resolveHeadToHeadSubgroup(teams, matches) {
    if (teams.length <= 1) {
      return teams;
    }

    const teamNames = teams.map((row) => row.name);
    const mini = miniLeagueTable(teamNames, matches);
    const sorted = teams.slice().sort((a, b) => {
      const statsA = mini[normalizeTeamName(a.name)] || { points: 0, gd: 0, gf: 0 };
      const statsB = mini[normalizeTeamName(b.name)] || { points: 0, gd: 0, gf: 0 };
      const cmp = compareMiniStats(statsA, statsB);
      return cmp !== 0 ? cmp : compareFairPlay(a, b);
    });

    const groups = [];
    sorted.forEach((row) => {
      const stats = mini[normalizeTeamName(row.name)] || { points: 0, gd: 0, gf: 0 };
      const key = miniStatsKey(stats);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({ key, teams: [row] });
        return;
      }
      last.teams.push(row);
    });

    return groups.flatMap((group) => {
      if (group.teams.length === 1) {
        return group.teams;
      }
      if (group.teams.length < teams.length) {
        return resolveHeadToHeadSubgroup(group.teams, matches);
      }
      return group.teams.slice().sort((a, b) => compareFairPlay(a, b));
    });
  }

  function groupConsecutive(rows, keyFn) {
    const groups = [];
    rows.forEach((row) => {
      const key = keyFn(row);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({ key, teams: [row] });
        return;
      }
      last.teams.push(row);
    });
    return groups;
  }

  function resolvePrimaryTieSubgroup(teams, matches) {
    const sorted = teams.slice().sort((a, b) => comparePrimary(a, b) || compareFairPlay(a, b));
    const groups = groupConsecutive(sorted, (row) => `${row.points}|${row.gd}|${row.gf}`);
    return groups.flatMap((group) => {
      if (group.teams.length === 1) {
        return group.teams;
      }
      return resolveHeadToHeadSubgroup(group.teams, matches);
    });
  }

  function rankGroupRows(rows, matches) {
    if (!rows || !rows.length) {
      return [];
    }

    const sorted = rows.slice().sort((a, b) => comparePrimary(a, b) || compareFairPlay(a, b));
    const pointGroups = groupConsecutive(sorted, (row) => String(row.points || 0));
    return pointGroups.flatMap((group) => resolvePrimaryTieSubgroup(group.teams, matches || []));
  }

  function compareFifaTeams(a, b, allRows, matches) {
    const primary = comparePrimary(a, b);
    if (primary !== 0) {
      return primary;
    }

    const ranked = rankGroupRows(allRows, matches);
    const indexA = ranked.findIndex((row) => row.name === a.name);
    const indexB = ranked.findIndex((row) => row.name === b.name);
    return indexA - indexB;
  }

  function filterGroupMatches(matches, groupName) {
    const target = String(groupName || "");
    return (matches || []).filter((match) => match.group === target);
  }

  function cloneStandingRow(row) {
    const gf = row.gf || 0;
    const gd = row.gd || 0;
    return {
      name: row.name,
      points: row.points || 0,
      gd,
      gf,
      ga: row.ga ?? (gf - gd),
      played: row.played || 0,
      index: row.index ?? 0,
      fairPlay: row.fairPlay ?? row.fairPlayPoints ?? 0
    };
  }

  function outcomeScores(code) {
    if (code === 0) {
      return { home: 1, away: 0 };
    }
    if (code === 1) {
      return { home: 1, away: 1 };
    }
    return { home: 0, away: 1 };
  }

  function applySimulatedResult(rowByName, home, away, homeScore, awayScore) {
    const homeRow = rowByName[normalizeTeamName(home)];
    const awayRow = rowByName[normalizeTeamName(away)];
    if (!homeRow || !awayRow) {
      return;
    }

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.gf += homeScore;
    homeRow.ga += awayScore;
    awayRow.gf += awayScore;
    awayRow.ga += homeScore;
    homeRow.gd = homeRow.gf - homeRow.ga;
    awayRow.gd = awayRow.gf - awayRow.ga;

    if (homeScore > awayScore) {
      homeRow.points += 3;
    } else if (homeScore < awayScore) {
      awayRow.points += 3;
    } else {
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  function buildSimulatedMatches(allMatches, unfinished, codes) {
    let unfinishedIndex = 0;
    return (allMatches || []).map((match) => {
      if (isGroupMatchFinished(match)) {
        return match;
      }

      const scores = outcomeScores(codes[unfinishedIndex]);
      unfinishedIndex += 1;
      return {
        ...match,
        homeScore: scores.home,
        awayScore: scores.away,
        statusState: "post",
        completed: true
      };
    });
  }

  function simulateStandingRows(rows, unfinished, codes) {
    const rowByName = {};
    rows.forEach((row) => {
      rowByName[normalizeTeamName(row.name)] = cloneStandingRow(row);
    });

    unfinished.forEach((match, index) => {
      const scores = outcomeScores(codes[index]);
      applySimulatedResult(rowByName, match.home, match.away, scores.home, scores.away);
    });

    return rows.map((row) => rowByName[normalizeTeamName(row.name)]);
  }

  function computeClinchedPositions(rows, matches) {
    const empty = {
      hasResults: false,
      winner: { name: null, clinched: false },
      runnerUp: { name: null, clinched: false },
      third: { name: null, clinched: false },
      ranked: []
    };

    if (!rows || !rows.length) {
      return empty;
    }

    const ranked = rankGroupRows(rows, matches || []);
    const hasResults = ranked.some((row) => (row.played || 0) > 0);
    if (!hasResults) {
      return { ...empty, ranked };
    }

    const keys = ["winner", "runnerUp", "third"];
    const indices = [0, 1, 2];
    const base = {
      hasResults: true,
      winner: { name: ranked[0]?.name || null, clinched: false },
      runnerUp: { name: ranked[1]?.name || null, clinched: false },
      third: { name: ranked[2]?.name || null, clinched: false },
      ranked
    };

    const unfinished = (matches || []).filter((match) => !isGroupMatchFinished(match));
    const groupComplete = rows.every((row) => (row.played || 0) >= 3);
    if (!unfinished.length) {
      if (groupComplete) {
        keys.forEach((key, index) => {
          if (ranked[index]?.name) {
            base[key].clinched = true;
          }
        });
      }
      return base;
    }

    const seen = {
      winner: new Set(),
      runnerUp: new Set(),
      third: new Set()
    };

    const scenarios = 3 ** unfinished.length;
    for (let scenario = 0; scenario < scenarios; scenario += 1) {
      const codes = [];
      let bits = scenario;
      for (let i = 0; i < unfinished.length; i += 1) {
        codes.push(bits % 3);
        bits = Math.floor(bits / 3);
      }

      const simulatedRows = simulateStandingRows(rows, unfinished, codes);
      const simulatedMatches = buildSimulatedMatches(matches, unfinished, codes);
      const finalRank = rankGroupRows(simulatedRows, simulatedMatches);
      keys.forEach((key, index) => {
        const name = finalRank[index]?.name;
        if (name) {
          seen[key].add(name);
        }
      });
    }

    keys.forEach((key, index) => {
      const name = ranked[index]?.name;
      base[key].clinched = !!name && seen[key].size === 1 && seen[key].has(name);
    });

    return base;
  }

  function isGroupWinnerClinched(rows, matches) {
    return computeClinchedPositions(rows, matches).winner.clinched;
  }

  function isGroupRunnerUpClinched(rows, matches) {
    return computeClinchedPositions(rows, matches).runnerUp.clinched;
  }

  function isGroupThirdClinched(rows, matches) {
    return computeClinchedPositions(rows, matches).third.clinched;
  }

  return {
    compareFifaTeams,
    rankGroupRows,
    miniLeagueTable,
    filterGroupMatches,
    computeClinchedPositions,
    isGroupWinnerClinched,
    isGroupRunnerUpClinched,
    isGroupThirdClinched
  };
});
