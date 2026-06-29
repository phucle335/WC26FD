(function (root) {
  const thirdApi = () => root.WC26ThirdPlaceCalculator || {};
  const bracketApi = () => root.WC26BracketGenerator || {};

  function normalizeGroupName(name) {
    return String(name || "").replace(/^Group\s+/i, "");
  }

  function sortRows(rows, matches) {
    const rank = root.WC26StandingsRank;
    if (rank && typeof rank.rankGroupRows === "function") {
      return rank.rankGroupRows(rows, matches || []);
    }
    return rows.slice().sort((a, b) =>
      (b.points || 0) - (a.points || 0)
      || (b.gd || 0) - (a.gd || 0)
      || (b.gf || 0) - (a.gf || 0)
      || (a.index || 0) - (b.index || 0)
    );
  }

  function buildRowsFromBridge(group, standings, bridge) {
    const table = standings[group.name] || {};
    const schedule = bridge.mergeRawSchedule ? bridge.mergeRawSchedule() : [];
    const matches = schedule.filter((match) => match.group === group.name);
    const rows = (group.teams || []).map((teamName, index) => {
      const row = table[teamName] || {};
      return {
        name: teamName,
        points: row.points || 0,
        gd: row.gd || 0,
        gf: row.gf || 0,
        played: row.played || 0,
        index
      };
    });
    return sortRows(rows, matches);
  }

  function eventState(event) {
    const competition = event?.competitions?.[0];
    const rawCompleted = event?.status?.type?.completed ?? competition?.status?.type?.completed;
    const rawState = event?.status?.type?.state || competition?.status?.type?.state || "";
    if (rawCompleted || rawState === "post") {
      return "completed";
    }
    if (rawState === "in") {
      return "live";
    }
    return "upcoming";
  }

  function fetchGroupStandings(bridge) {
    const standings = bridge.buildStandings ? bridge.buildStandings() : {};
    const schedule = bridge.mergeRawSchedule ? bridge.mergeRawSchedule() : [];
    return (bridge.groups || []).map((group) => {
      const matches = schedule.filter((match) => match.group === group.name);
      return {
        group: normalizeGroupName(group.name),
        matches,
        teams: buildRowsFromBridge(group, standings, bridge)
      };
    });
  }

  function fetchThirdPlacedTeams(bridge) {
    const groupStandings = fetchGroupStandings(bridge);
    return thirdApi().rankThirdPlacedTeams
      ? thirdApi().rankThirdPlacedTeams(groupStandings).bestEight
      : [];
  }

  function fetchKnockoutBracket(bridge) {
    const groupStandings = fetchGroupStandings(bridge);
    const thirds = fetchThirdPlacedTeams(bridge);
    const bracket = bracketApi().generateKnockoutBracket
      ? bracketApi().generateKnockoutBracket(groupStandings, thirds)
      : { fixtures: [] };
    const events = bridge.getLiveEvents ? bridge.getLiveEvents() : [];
    return {
      ...bracket,
      groupStandings,
      thirdPlaceTable: thirds,
      eventsByState: {
        completed: events.filter((e) => eventState(e) === "completed"),
        live: events.filter((e) => eventState(e) === "live"),
        upcoming: events.filter((e) => eventState(e) === "upcoming")
      }
    };
  }

  root.WC26EspnKnockoutService = {
    fetchGroupStandings,
    fetchThirdPlacedTeams,
    fetchKnockoutBracket
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
