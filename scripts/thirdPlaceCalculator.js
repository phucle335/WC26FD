(function (root) {
  function sortRows(rows, matches) {
    const rank = root.WC26StandingsRank;
    if (rank && typeof rank.rankGroupRows === "function") {
      return rank.rankGroupRows(rows, matches || []);
    }
    return rows.slice().sort((a, b) =>
      (b.points || 0) - (a.points || 0)
      || (b.gd || 0) - (a.gd || 0)
      || (b.gf || 0) - (a.gf || 0)
      || String(a.name || "").localeCompare(String(b.name || ""))
    );
  }

  function buildPosition(name, clinched, groupComplete, hasResults) {
    if (!name || !hasResults) {
      return { name: null, confirmed: false, predicted: false };
    }
    if (groupComplete || clinched) {
      return { name, confirmed: true, predicted: false };
    }
    return { name, confirmed: false, predicted: true };
  }

  function computeTopTwoByGroup(groupStandings) {
    const rankApi = root.WC26StandingsRank || {};
    const map = {};
    (groupStandings || []).forEach((group) => {
      const matches = group.matches || [];
      const rows = sortRows(group.teams || [], matches);
      if (!rows.length) {
        return;
      }

      const groupComplete = rows.every((row) => (row.played || 0) >= 3);
      const clinched = typeof rankApi.computeClinchedPositions === "function"
        ? rankApi.computeClinchedPositions(rows, matches)
        : {
          hasResults: rows.some((row) => (row.played || 0) > 0),
          winner: { clinched: false },
          runnerUp: { clinched: false },
          third: { clinched: false },
          ranked: rows
        };

      const winner = buildPosition(
        rows[0]?.name || null,
        !!clinched.winner?.clinched,
        groupComplete,
        clinched.hasResults
      );
      const runnerUp = buildPosition(
        rows[1]?.name || null,
        !!clinched.runnerUp?.clinched,
        groupComplete,
        clinched.hasResults
      );
      const third = buildPosition(
        rows[2]?.name || null,
        !!clinched.third?.clinched,
        groupComplete,
        clinched.hasResults
      );

      map[group.group] = {
        winner,
        runnerUp,
        third,
        complete: groupComplete,
        winnerClinched: winner.confirmed && !groupComplete,
        runnerUpClinched: runnerUp.confirmed && !groupComplete,
        thirdClinched: third.confirmed && !groupComplete,
        ranked: rows
      };
    });
    return map;
  }

  function rankThirdPlacedTeams(groupStandings) {
    const topTwo = computeTopTwoByGroup(groupStandings);
    const thirds = Object.keys(topTwo).map((group) => {
      const third = topTwo[group].third;
      const row = topTwo[group].ranked?.[2];
      if (!third?.name || !row) {
        return null;
      }
      return {
        group,
        name: third.name,
        points: row.points || 0,
        gd: row.gd || 0,
        gf: row.gf || 0,
        played: row.played || 0,
        complete: topTwo[group].complete,
        confirmed: third.confirmed,
        predicted: third.predicted
      };
    }).filter(Boolean);

    const ranked = thirds.slice().sort((a, b) =>
      b.points - a.points
      || b.gd - a.gd
      || b.gf - a.gf
      || a.group.localeCompare(b.group)
    );

    const completeGroups = Object.values(topTwo).filter((g) => g.complete).length;
    const bestEight = ranked.length >= 8 ? ranked.slice(0, 8) : [];
    const bestEightConfirmed = completeGroups === 12
      && bestEight.length === 8
      && bestEight.every((row) => row.confirmed);
    return { ranked, bestEight, bestEightConfirmed, topTwo };
  }

  root.WC26ThirdPlaceCalculator = {
    computeTopTwoByGroup,
    rankThirdPlacedTeams
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
