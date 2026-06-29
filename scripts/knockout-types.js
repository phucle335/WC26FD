(function (root) {
  /**
   * @typedef {"FINISHED"|"LIVE"|"SCHEDULED"} ApiMatchStatus
   * @typedef {{ id: string, name: string, score: number|null, penaltyScore: number|null }} ApiTeam
   * @typedef {{
   *   matchId: string,
   *   round: string,
   *   status: ApiMatchStatus,
   *   matchTime: string,
   *   matchClock?: string,
   *   homeTeam: ApiTeam,
   *   awayTeam: ApiTeam,
   *   winnerId: string|null,
   *   venue?: string,
   *   matchNum?: number
   * }} ApiMatch
   * @typedef {{
   *   id: string,
   *   wing: "left"|"right"|"center",
   *   round: string,
   *   matchNum: number,
   *   utc: string,
   *   venue: string,
   *   homeSlot: object,
   *   awaySlot: object,
   *   nextWinnerSlot?: string
   * }} KnockoutFixture
   */

  root.WC26KnockoutTypes = {
    STATUS_FINISHED: "FINISHED",
    STATUS_LIVE: "LIVE",
    STATUS_SCHEDULED: "SCHEDULED"
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
