(function (root) {
  const LOCK_KEY = "wc26_knockout_locked";
  const AUTO_DELAY_MS = 24 * 60 * 60 * 1000;
  const MARKUP_VERSION = "v2-26";
  const KO_NEXT_MATCH_MARKUP = `
      <div class="ko-v2-next-match-stack">
        <div class="ko-v2-next-match is-clickable" id="ko-next-match-stage" role="button" tabindex="0" aria-label="Trận tiếp theo">
          <div class="ko-next-eyebrow" id="ko-next-round">TRẬN TIẾP</div>
          <div class="ko-next-matchup">
            <div class="ko-next-team-card">
              <div class="ko-next-flag flag-img" id="ko-next-home-flag" aria-hidden="true"></div>
              <div class="ko-next-team-name" id="ko-next-home-name">—</div>
            </div>
            <div class="ko-next-meta">
              <div class="ko-next-label" id="ko-next-vs-label">Sắp diễn ra</div>
              <p class="ko-next-title" id="ko-next-title">—</p>
              <p class="ko-next-subtitle" id="ko-next-time">—</p>
            </div>
            <div class="ko-next-team-card">
              <div class="ko-next-flag flag-img" id="ko-next-away-flag" aria-hidden="true"></div>
              <div class="ko-next-team-name" id="ko-next-away-name">—</div>
            </div>
          </div>
          <div class="ko-next-stage" id="ko-next-stage-display">
            <div class="ko-next-timer" id="ko-next-countdown" aria-live="polite">
              <div class="ko-next-time-unit">
                <div class="ko-next-digits" id="ko-next-hours">00</div>
                <div class="ko-next-unit-label">GIỜ</div>
              </div>
              <div class="ko-next-colon">:</div>
              <div class="ko-next-time-unit">
                <div class="ko-next-digits" id="ko-next-minutes">00</div>
                <div class="ko-next-unit-label">PHÚT</div>
              </div>
              <div class="ko-next-colon">:</div>
              <div class="ko-next-time-unit">
                <div class="ko-next-digits" id="ko-next-seconds">00</div>
                <div class="ko-next-unit-label">GIÂY</div>
              </div>
            </div>
          </div>
        </div>
        <div class="ko-next-live-strip hidden" id="ko-next-live-strip" aria-live="polite">
          <div class="ko-next-live" id="ko-next-live-board">
            <div class="ko-next-live-badge">Trực tiếp</div>
            <div class="ko-next-live-score">
              <div class="ko-next-time-unit ko-next-live-unit">
                <div class="ko-next-digits" id="ko-next-live-home-score">0</div>
                <div class="ko-next-unit-label" id="ko-next-live-home-short">---</div>
              </div>
              <div class="ko-next-colon ko-next-live-sep">-</div>
              <div class="ko-next-time-unit ko-next-live-unit">
                <div class="ko-next-digits" id="ko-next-live-away-score">0</div>
                <div class="ko-next-unit-label" id="ko-next-live-away-short">---</div>
              </div>
            </div>
            <div class="ko-next-live-minute" id="ko-next-live-minute">Đang đá</div>
          </div>
          <div class="ko-next-timeline" id="ko-next-live-timeline">
            <div class="live-timeline-head">Sự kiện trận đấu</div>
            <div class="live-timeline-list" id="ko-next-timeline-list"></div>
          </div>
        </div>
      </div>`;
  const KO_ROUND_ORDER = ["R32", "R16", "QF", "SF", "F", "TP"];
  const ROUND_LABELS = {
    R32: "ROUND OF 32",
    R16: "ROUND OF 16",
    QF: "QUARTER-FINAL",
    SF: "SEMI-FINAL",
    F: "FINAL",
    TP: "3RD PLACE"
  };
  const KO_LIST_PAGES = [
    { id: "R32", label: "R32", rounds: ["R32"] },
    { id: "R16", label: "R16", rounds: ["R16"] },
    { id: "QF", label: "QF", rounds: ["QF"] },
    { id: "SF", label: "SF", rounds: ["SF"] },
    { id: "FINAL", label: "FINAL", rounds: ["F", "TP"] }
  ];
  const KO_LIST_ROUND_NAV = KO_LIST_PAGES.map((page, index) => `
      <button class="group-button${index === 0 ? " active" : ""}" type="button"
        data-ko-list-round="${index}" aria-label="${ROUND_LABELS[page.id] || page.label}"
        aria-current="${index === 0 ? "true" : "false"}">${page.label}</button>`).join("");
  const KO_PLAYER_PAGE_SIZE = 6;
  const KO_PLAYED_PAGE_SIZE = 5;
  const KO_UPCOMING_PAGE_SIZE = 8;
  const KO_ROUND_PANEL_TITLES = {
    R32: "VÒNG 32",
    R16: "VÒNG 16",
    QF: "TỨ KẾT",
    SF: "BÁN KẾT",
    FINAL: "CHUNG KẾT"
  };
  const KO_VENUE_SHORT = {
    "SoFi Stadium": "SoFi",
    "NRG Stadium": "NRG",
    "Estadio BBVA": "BBVA",
    "Lincoln Financial Field": "Linc. Fld",
    "Rose Bowl": "Rose Bowl",
    "BC Place": "BC Place",
    "BMO Field": "BMO Fld",
    "GEHA Field": "GEHA",
    "Gillette Stadium": "Gillette",
    "AT&T Stadium": "AT&T",
    "MetLife Stadium": "MetLife",
    "Mercedes-Benz Stadium": "M-Benz",
    "Lumen Field": "Lumen",
    "Levi's Stadium": "Levi's",
    "Hard Rock Stadium": "Hard Rock",
    "Arrowhead Stadium": "Arrowhead"
  };
  const EMBEDDED_MARKUP = `<div class="ko-v2-inner knockout-page">
  <button class="history-back ko-v2-back" type="button" id="knockout-back-btn">← Vòng bảng</button>
  <div class="ko-v2-body">
    <aside class="panel standings-panel knockout-panel knockout-panel--left ko-v2-panel ko-v2-left" aria-label="Trận đã đá và thống kê">
      <div class="panel-head">
        <h2 class="panel-title" id="ko-left-panel-title">Trận đã đá</h2>
        <div class="panel-tools">
          <div class="panel-kicker" id="ko-left-panel-kicker">LIVE · FT</div>
        </div>
      </div>
      <div class="standings-scroll" id="ko-left-scroll">
        <div id="ko-match-list-view"></div>
        <div id="ko-match-detail-view" class="standings-overlay hidden"></div>
        <div id="ko-player-stats-view" class="standings-overlay hidden"></div>
      </div>
    </aside>
    <section class="panel knockout-bracket-area ko-v2-bracket-area">
      <div class="ko-v2-bracket-scroll" id="ko-bracket-scroll">
        <div class="knockout-bracket-stage ko-v2-bracket-stage" id="ko-bracket-stage">
          <div class="ko-bracket-head">
            <div class="ko-bracket-eyebrow">FIFA <span class="ko-bracket-gold">WORLD CUP 2026</span>™</div>
            <div class="ko-bracket-sub">Road to final</div>
          </div>
          <svg class="knockout-bracket-connectors ko-v2-connectors" id="knockout-connectors" aria-hidden="true"></svg>
          <div class="knockout-bracket-grid ko-v2-bracket" id="knockout-bracket">
            <div class="ko-v2-wing ko-v2-wing-left" id="ko-wing-left"></div>
            <div class="ko-v2-hub" id="ko-wing-center"></div>
            <div class="ko-v2-wing ko-v2-wing-right" id="ko-wing-right"></div>
          </div>
          <div class="ko-v2-next-match-dock" id="ko-next-match-dock">${KO_NEXT_MATCH_MARKUP}</div>
        </div>
      </div>
    </section>
    <aside class="panel fixtures-panel knockout-panel upcoming-matches-panel knockout-panel--right ko-v2-right">
      <div class="panel-head">
        <h2 class="panel-title" id="ko-right-panel-title">VÒNG 32</h2>
        <div class="panel-tools">
          <div class="group-controls" id="ko-round-controls" aria-label="Chuyển vòng knockout">
            ${KO_LIST_ROUND_NAV}
          </div>
          <div class="group-controls" id="ko-upcoming-page-controls" aria-label="Trang lịch thi đấu"></div>
          <div class="panel-kicker" id="ko-right-panel-kicker">ROUND OF 32</div>
          <div class="panel-kicker" id="knockout-data-status">PREVIEW</div>
        </div>
      </div>
      <div class="fixtures-list" id="ko-upcoming"></div>
    </aside>
  </div>
  <div class="ko-v2-local-clock-wrap" aria-hidden="false">
    <div class="ko-v2-local-clock" id="ko-local-clock">Giờ VN · —</div>
  </div>
</div>`;

  let initialized = false;
  let knockoutVisible = false;
  let bracketState = null;
  let poller = null;
  let tickTimer = 0;
  let resizeObserver = null;
  let windowResizeBound = false;
  let orientationBound = false;
  const resizeObserveTargets = [];
  let lastRenderKey = "";
  let lastStandingsKey = "";
  let koLeftOverlay = "list";
  let koSelectedBracketId = "";
  let koDetailTab = "stats";
  let koPlayerTab = "goals";
  let koPlayerStatsPage = 0;
  let koPlayerStatsLeaders = null;
  let koDetailToken = 0;
  let koCurrentDetailSummary = null;
  let koCenterMatchKey = "";
  let koCenterMatchPinned = false;
  let koCenterBracketId = "";
  let koWidgetBracketId = "";
  let lastKoNextIdentity = "";
  let lastKoLiveScoresKey = "";
  let lastKoLiveFetchAt = 0;
  let pendingKnockoutRebuild = false;
  let koTimelineFetchKey = "";
  let koTimelineFetchAt = 0;
  const KO_TIMELINE_FETCH_MS = 12000;
  let koListRoundPage = 0;
  let koUpcomingPage = 0;
  let koPlayedPage = 0;

  function validateFixtureDates(fixtures) {
    const errors = [];
    (fixtures || []).forEach((f) => {
      if (!f.utc) {
        errors.push({ match: f.id, error: "Missing utc", fixture: f });
        console.error("Missing fixture date:", f.id, f);
      }
      if (!f.apiMatch?.matchTime && !f.utc) {
        errors.push({ match: f.id, error: "Missing both matchTime and utc" });
      }
    });
    return errors;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function bridge() {
    return root.WC26Bridge || {};
  }

  function matchDetailApi() {
    return root.WC26MatchDetail || {};
  }

  function getBracketMatchById(id) {
    if (!id || !bracketState) {
      return null;
    }
    return bracketState.byId?.[id] || bracketState.matches?.find((m) => m.id === id) || null;
  }

  function getKoListPageMeta() {
    return KO_LIST_PAGES[koListRoundPage] || KO_LIST_PAGES[0];
  }

  function getKoListActiveRounds() {
    return getKoListPageMeta().rounds;
  }

  function syncKoListRoundUi() {
    const meta = getKoListPageMeta();
    const rightTitle = $("ko-right-panel-title");
    const rightKicker = $("ko-right-panel-kicker");

    if (rightTitle) {
      rightTitle.textContent = KO_ROUND_PANEL_TITLES[meta.id] || meta.label;
    }
    if (rightKicker) {
      if (meta.id === "FINAL") {
        rightKicker.textContent = "FINAL · 3RD PLACE";
      } else {
        rightKicker.textContent = ROUND_LABELS[meta.id] || meta.label;
      }
    }

    document.querySelectorAll("[data-ko-list-round]").forEach((button) => {
      const index = Number(button.dataset.koListRound);
      const active = index === koListRoundPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function setKoListRoundPage(page) {
    const next = Math.max(0, Math.min(KO_LIST_PAGES.length - 1, page));
    if (next === koListRoundPage) {
      return;
    }
    koListRoundPage = next;
    koUpcomingPage = 0;
    lastRenderKey = "";
    syncKoListRoundUi();
    renderUpcoming();
  }

  function setKoLeftPanelHead(mode) {
    const titleEl = $("ko-left-panel-title");
    const kickerEl = $("ko-left-panel-kicker");
    if (!titleEl) {
      return;
    }

    if (mode === "players") {
      titleEl.textContent = "Top Goals · Top Assists";
      if (kickerEl) {
        kickerEl.textContent = "WC26";
      }
      return;
    }

    if (mode === "detail") {
      const match = getBracketMatchById(koSelectedBracketId);
      titleEl.textContent = ROUND_LABELS[match?.round] || "Chi tiết trận";
      if (kickerEl) {
        kickerEl.textContent = "KO";
      }
      return;
    }

    titleEl.textContent = "Trận đã đá";
    if (kickerEl) {
      kickerEl.textContent = "LIVE · FT";
    }
  }

  function showKoLeftList() {
    koLeftOverlay = "list";
    koSelectedBracketId = "";
    koDetailToken += 1;
    koCurrentDetailSummary = null;
    koPlayerStatsPage = 0;
    $("ko-match-list-view")?.classList.remove("hidden");
    $("ko-match-detail-view")?.classList.add("hidden");
    $("ko-player-stats-view")?.classList.add("hidden");
    setKoLeftPanelHead("list");
    syncKoListRoundUi();
    renderKoMatchList();
    root.requestAnimationFrame(() => refitBracket());
  }

  function interleaveWingMatches(matches) {
    const byUtc = (a, b) => Date.parse(a.utc) - Date.parse(b.utc);
    const left = matches.filter((m) => m.wing === "left").sort(byUtc);
    const right = matches.filter((m) => m.wing === "right").sort(byUtc);
    const center = matches.filter((m) => m.wing === "center").sort(byUtc);
    const merged = [];
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (left[i]) {
        merged.push(left[i]);
      }
      if (right[i]) {
        merged.push(right[i]);
      }
    }
    return merged.concat(center);
  }

  function pickBalancedUpcoming(matches, limit = 5) {
    const upcoming = (matches || [])
      .filter((m) => m.apiMatch?.status !== "FINISHED")
      .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc));
    const left = upcoming.filter((m) => m.wing === "left");
    const right = upcoming.filter((m) => m.wing === "right");
    const center = upcoming.filter((m) => m.wing === "center");
    const picked = [];
    const seen = new Set();
    const add = (match) => {
      if (!match || seen.has(match.id) || picked.length >= limit) {
        return;
      }
      seen.add(match.id);
      picked.push(match);
    };

    let leftIndex = 0;
    let rightIndex = 0;
    while (picked.length < limit && (leftIndex < left.length || rightIndex < right.length)) {
      if (leftIndex < left.length) {
        add(left[leftIndex]);
        leftIndex += 1;
      }
      if (picked.length >= limit) {
        break;
      }
      if (rightIndex < right.length) {
        add(right[rightIndex]);
        rightIndex += 1;
      }
    }

    upcoming.forEach((match) => add(match));
    center.forEach((match) => add(match));
    return picked.slice(0, limit);
  }

  function canOpenKoMatchDetail(bracketMatch) {
    const api = bracketMatch?.apiMatch;
    if (!api) {
      return false;
    }

    const home = api.homeTeam?.name || "";
    const away = api.awayTeam?.name || "";
    if (!home || !away) {
      return false;
    }

    return true;
  }

  function isCompactBracketViewport() {
    return root.innerWidth <= 1920 || root.innerHeight <= 1080;
  }

  function formatBracketVenue(venue, compact = isCompactBracketViewport()) {
    const raw = String(venue || "").trim();
    if (!raw) {
      return "—";
    }
    if (!compact) {
      return raw;
    }
    if (KO_VENUE_SHORT[raw]) {
      return KO_VENUE_SHORT[raw];
    }
    return raw
      .replace(/\s+Stadium$/i, "")
      .replace(/^Estadio\s+/i, "Est. ")
      .replace(/^Mercedes-Benz$/i, "M-Benz")
      .replace(/^Lincoln Financial Field$/i, "Linc. Fld");
  }

  function getPlayedMatches() {
    const roundRank = new Map(KO_ROUND_ORDER.map((round, index) => [round, index]));
    return (bracketState?.matches || [])
      .filter((m) => {
        const status = m.apiMatch?.status;
        return status === "LIVE" || status === "FINISHED";
      })
      .sort((left, right) => {
        const roundDiff = (roundRank.get(right.round) ?? 0) - (roundRank.get(left.round) ?? 0);
        if (roundDiff !== 0) {
          return roundDiff;
        }
        return Date.parse(right.utc) - Date.parse(left.utc);
      });
  }

  function getKoPlayedPageCount() {
    const total = getPlayedMatches().length;
    return Math.max(1, Math.ceil(total / KO_PLAYED_PAGE_SIZE));
  }

  function playedMatchesForPage() {
    const all = getPlayedMatches();
    const pageCount = getKoPlayedPageCount();
    const page = Math.min(koPlayedPage, pageCount - 1);
    const start = page * KO_PLAYED_PAGE_SIZE;
    return all.slice(start, start + KO_PLAYED_PAGE_SIZE);
  }

  function renderKoPlayedPagination(page, totalPages) {
    if (totalPages <= 1) {
      return "";
    }
    return `
      <div class="ko-played-pages" role="navigation" aria-label="Trang trận đã đá">
        <button class="group-button ko-played-nav" type="button" data-ko-played-nav="prev"
          aria-label="Trang trước" ${page <= 0 ? "disabled" : ""}>‹ Trước</button>
        <span class="ko-played-page-label" aria-live="polite">${page + 1}/${totalPages}</span>
        <button class="group-button ko-played-nav" type="button" data-ko-played-nav="next"
          aria-label="Trang sau" ${page >= totalPages - 1 ? "disabled" : ""}>Sau ›</button>
      </div>`;
  }

  function stepKoPlayedPage(delta) {
    setKoPlayedPage(koPlayedPage + delta);
  }

  function setKoPlayedPage(page) {
    const next = Math.max(0, Math.min(getKoPlayedPageCount() - 1, page));
    if (next === koPlayedPage) {
      return;
    }
    koPlayedPage = next;
    renderKoMatchList();
  }

  function renderKoMatchList() {
    const listEl = $("ko-match-list-view");
    if (!listEl || koLeftOverlay !== "list") {
      return;
    }

    const detail = matchDetailApi();
    const b = bridge();
    const allPlayed = getPlayedMatches();
    const pageCount = getKoPlayedPageCount();
    if (koPlayedPage >= pageCount) {
      koPlayedPage = 0;
    }
    const pageMatches = playedMatchesForPage();
    const safePage = Math.min(koPlayedPage, pageCount - 1);

    let playedSection = "";
    if (!allPlayed.length) {
      playedSection = '<div class="timeline-empty">Chưa có trận đã đá.</div>';
    } else {
      const rows = pageMatches.map((m) => {
        const api = m.apiMatch;
        const display = detail.buildKnockoutDisplayMatch?.(m);
        const live = api.status === "LIVE";
        const finishedMatch = api.status === "FINISHED";
        const homeRaw = api.homeTeam.name;
        const awayRaw = api.awayTeam.name;
        const home = b.canonicalName ? b.canonicalName(homeRaw) : homeRaw;
        const away = b.canonicalName ? b.canonicalName(awayRaw) : awayRaw;
        let centerText = "vs";
        if (live) {
          centerText = api.matchClock || "LIVE";
        } else if (finishedMatch && api.homeTeam.score != null && api.awayTeam.score != null) {
          centerText = `${api.homeTeam.score}-${api.awayTeam.score}`;
        }
        const scoreText = display && detail.renderMatchScoreRow && detail.scoreText
          ? detail.renderMatchScoreRow(display.home, display.away, detail.scoreText(display))
          : renderKoListScoreRow(
            home,
            away,
            centerText,
            api.homeTeam.id,
            api.awayTeam.id,
            api.homeTeam.qualStatus,
            api.awayTeam.qualStatus
          );
        const roundLabel = ROUND_LABELS[m.round] || m.round;
        const timeLabel = live
          ? `${api.matchClock || "LIVE"} · LIVE`
          : `FT · ${b.formatVietnamTime ? b.formatVietnamTime(api.matchTime || m.utc) : formatBracketTime(m.utc)}`;

        return `
          <button class="history-match-row${live ? " is-live" : ""}"
            type="button"
            data-ko-match-id="${m.id}">
            <div class="history-match-score">${scoreText}</div>
            <div class="history-match-meta">
              <span>${roundLabel} · ${timeLabel}</span>
              <span>${api.venue || m.venue || "—"}</span>
            </div>
          </button>`;
      }).join("");

      playedSection = `
        <section class="group-card ko-played-card">
          <div class="group-head">
            <div class="group-name">Trận đã đá</div>
            <div class="group-status">${allPlayed.length} trận</div>
          </div>
          <div class="ko-played-rows">${rows}</div>
          ${renderKoPlayedPagination(safePage, pageCount)}
        </section>`;
    }

    listEl.innerHTML = `
      <div class="ko-played-section">
        ${playedSection}
      </div>
      <div class="ko-player-stats-embed" id="ko-player-stats-embed" aria-label="Top Goals và Top Assists">
        <div class="timeline-empty">Đang tải thống kê cầu thủ…</div>
      </div>`;
    applyKoPanelFlags(listEl);
    renderKoPlayerStatsEmbed();
  }

  async function openKoMatchDetail(bracketId, tab = "stats") {
    const bracketMatch = getBracketMatchById(bracketId);
    if (!bracketMatch || !canOpenKoMatchDetail(bracketMatch)) {
      return;
    }

    const detail = matchDetailApi();
    let displayMatch = detail.buildKnockoutDisplayMatch?.(bracketMatch);
    if (!displayMatch) {
      displayMatch = buildKoWidgetDisplayMatch(bracketMatch);
    }
    const detailEl = $("ko-match-detail-view");
    if (!displayMatch || !detailEl || !detail.renderMatchDetailMarkup) {
      return;
    }

    koLeftOverlay = "detail";
    koSelectedBracketId = bracketId;
    koDetailTab = tab === "lineup" ? "lineup" : "stats";
    const token = ++koDetailToken;

    $("ko-match-list-view")?.classList.add("hidden");
    $("ko-player-stats-view")?.classList.add("hidden");
    detailEl.classList.remove("hidden");
    setKoLeftPanelHead("detail");
    syncKoListRoundUi();

    detailEl.innerHTML = detail.renderMatchDetailMarkup(displayMatch, koDetailTab, {
      backAction: "back-ko-list",
      backLabel: "← Quay lại",
      headLabel: ROUND_LABELS[bracketMatch.round] || bracketMatch.round,
      panelId: "ko-detail-tab-panel"
    });

    const panel = detailEl.querySelector("#ko-detail-tab-panel");
    let summary = null;
    try {
      if (detail.fetchDisplayMatchSummary) {
        summary = await detail.fetchDisplayMatchSummary(displayMatch);
      }
    } catch (e) {
      summary = null;
    }

    if (token !== koDetailToken || koSelectedBracketId !== bracketId) {
      return;
    }

    koCurrentDetailSummary = summary;
    detail.renderDetailTabPanel?.(summary, displayMatch, koDetailTab, panel);
    root.requestAnimationFrame(() => refitBracket());
  }

  async function switchKoDetailTab(tab) {
    if (koLeftOverlay !== "detail" || !koSelectedBracketId || tab === koDetailTab) {
      return;
    }

    const bracketMatch = getBracketMatchById(koSelectedBracketId);
    const detail = matchDetailApi();
    const displayMatch = detail.buildKnockoutDisplayMatch?.(bracketMatch);
    const detailEl = $("ko-match-detail-view");
    if (!displayMatch || !detailEl) {
      return;
    }

    koDetailTab = tab === "lineup" ? "lineup" : "stats";
    detailEl.querySelectorAll(".detail-tab").forEach((button) => {
      const active = button.dataset.detailTab === koDetailTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active);
    });

    const panel = detailEl.querySelector("#ko-detail-tab-panel");
    if (koCurrentDetailSummary) {
      detail.renderDetailTabPanel?.(koCurrentDetailSummary, displayMatch, koDetailTab, panel);
      return;
    }

    detail.renderDetailTabPanel?.(null, displayMatch, koDetailTab, panel);
  }

  function formatKoStatCell(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    return String(value);
  }

  function buildKoPlayerRows(rows, tab) {
    return (rows || []).map((row) => ({
      ...row,
      cells: [
        { value: row.goals, primary: tab === "goals" },
        { value: row.assists, primary: tab === "assists" },
        { value: row.shots, primary: false }
      ]
    }));
  }

  function renderKoPlayerRow(row) {
    const b = bridge();
    const flag = b.flagStyle ? b.flagStyle(row.team) : "";
    return `
      <tr>
        <td class="player-stats-rank">${row.rank || "—"}</td>
        <td class="player-col">
          <div class="player-stats-player">
            <span class="flag-img" style="${flag}" aria-hidden="true"></span>
            <div class="player-stats-name">
              <strong>${row.name || "—"}</strong>
              <span class="player-stats-team">${row.team || "—"}</span>
            </div>
          </div>
        </td>
        ${row.cells.map((cell) => `<td${cell.primary ? ' class="player-stats-primary"' : ""}>${formatKoStatCell(cell.value)}</td>`).join("")}
      </tr>`;
  }

  function renderKoPlayerStatsPagination(page, totalPages) {
    if (totalPages <= 1) {
      return "";
    }

    return `
      <div class="ko-player-stats-pages" role="navigation" aria-label="Trang thống kê cầu thủ">
        <button class="group-button ko-player-nav" type="button" data-ko-player-nav="prev"
          aria-label="Trang trước" ${page <= 0 ? "disabled" : ""}>‹ Trước</button>
        <span class="ko-player-page-label" aria-live="polite">${page + 1}/${totalPages}</span>
        <button class="group-button ko-player-nav" type="button" data-ko-player-nav="next"
          aria-label="Trang sau" ${page >= totalPages - 1 ? "disabled" : ""}>Sau ›</button>
      </div>`;
  }

  function stepKoPlayerStatsPage(delta) {
    goToKoPlayerStatsPage(koPlayerStatsPage + delta);
  }

  function buildKoPlayerStatsHtmlFromLeaders(leaders, tab, page = 0, options = {}) {
    const embed = Boolean(options.embed);
    const activeTab = tab === "assists" ? "assists" : "goals";
    const allRows = buildKoPlayerRows(leaders?.[activeTab] || [], activeTab);
    const totalPages = Math.max(1, Math.ceil(allRows.length / KO_PLAYER_PAGE_SIZE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const pageRows = allRows.slice(
      safePage * KO_PLAYER_PAGE_SIZE,
      safePage * KO_PLAYER_PAGE_SIZE + KO_PLAYER_PAGE_SIZE
    );
    const headers = embed
      ? ["#", "Cầu thủ", "Bàn", "KT", "Sút"]
      : ["Hạng", "Cầu thủ", "Bàn", "Kiến tạo", "Tổng sút"];
    const tableBody = pageRows.length
      ? pageRows.map((row) => renderKoPlayerRow(row)).join("")
      : `<tr><td colspan="${headers.length}">Chưa có dữ liệu cầu thủ.</td></tr>`;

    const backButton = embed
      ? ""
      : `<button class="history-back" type="button" data-action="back-ko-list">← Quay lại danh sách</button>`;
    const sourceLine = embed
      ? ""
      : `<div class="player-stats-source">Nguồn: LiveScore · WC26</div>`;

    return `
      ${backButton}
      <div class="player-stats-tabs${embed ? " is-embed" : ""}" role="tablist" aria-label="Thống kê cầu thủ">
        <button class="player-stats-tab${activeTab === "goals" ? " active" : ""}" type="button" data-player-tab="goals" role="tab" aria-selected="${activeTab === "goals"}">Top ghi bàn</button>
        <button class="player-stats-tab${activeTab === "assists" ? " active" : ""}" type="button" data-player-tab="assists" role="tab" aria-selected="${activeTab === "assists"}">Top kiến tạo</button>
      </div>
      <div class="player-stats-table-wrap${embed ? " is-embed" : ""}">
        <table class="player-stats-table${embed ? " is-embed" : ""}">
          <thead>
            <tr>${headers.map((label) => `<th>${label}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
      ${renderKoPlayerStatsPagination(safePage, totalPages)}
      ${sourceLine}`;
  }

  async function renderKoPlayerStatsEmbed(options = {}) {
    const embedEl = $("ko-player-stats-embed");
    if (!embedEl || koLeftOverlay !== "list") {
      return;
    }

    if (!koPlayerStatsLeaders || options.forceFetch) {
      embedEl.innerHTML = '<div class="timeline-empty">Đang tải thống kê cầu thủ…</div>';
      try {
        await ensureKoPlayerLeaders(Boolean(options.forceFetch));
      } catch (e) {
        embedEl.innerHTML = '<div class="timeline-empty">Không tải được thống kê cầu thủ.</div>';
        return;
      }
    }

    embedEl.innerHTML = buildKoPlayerStatsHtmlFromLeaders(
      koPlayerStatsLeaders,
      koPlayerTab,
      koPlayerStatsPage,
      { embed: true }
    );
  }

  async function ensureKoPlayerLeaders(force = false) {
    if (!force && koPlayerStatsLeaders) {
      return koPlayerStatsLeaders;
    }

    const b = bridge();
    koPlayerStatsLeaders = b.fetchPlayerLeaders
      ? await b.fetchPlayerLeaders(force)
      : { goals: [], assists: [] };
    return koPlayerStatsLeaders;
  }

  async function renderKoPlayerStatsView(tab = koPlayerTab, page = koPlayerStatsPage, options = {}) {
    const statsEl = $("ko-player-stats-view");
    if (!statsEl) {
      return;
    }

    const activeTab = tab === "assists" ? "assists" : "goals";
    koPlayerTab = activeTab;
    koPlayerStatsPage = Math.max(0, page);

    if (!koPlayerStatsLeaders || options.forceFetch) {
      statsEl.innerHTML = '<div class="timeline-empty">Đang tải...</div>';
      await ensureKoPlayerLeaders(Boolean(options.forceFetch));
    }

    statsEl.innerHTML = buildKoPlayerStatsHtmlFromLeaders(
      koPlayerStatsLeaders,
      activeTab,
      koPlayerStatsPage
    );
  }

  async function buildKoPlayerStatsHtml(tab, page = 0) {
    const leaders = await ensureKoPlayerLeaders(true);
    return buildKoPlayerStatsHtmlFromLeaders(leaders, tab, page);
  }

  async function openKoPlayerStats(tab = "goals") {
    const statsEl = $("ko-player-stats-view");
    if (!statsEl) {
      return;
    }

    koLeftOverlay = "players";
    koPlayerTab = tab === "assists" ? "assists" : "goals";
    koPlayerStatsPage = 0;
    koPlayerStatsLeaders = null;
    koDetailToken += 1;

    $("ko-match-list-view")?.classList.add("hidden");
    $("ko-match-detail-view")?.classList.add("hidden");
    statsEl.classList.remove("hidden");
    setKoLeftPanelHead("players");
    syncKoListRoundUi();

    try {
      await renderKoPlayerStatsView(koPlayerTab, 0, { forceFetch: true });
    } catch (e) {
      statsEl.innerHTML = `
        <button class="history-back" type="button" data-action="back-ko-list">← Quay lại danh sách</button>
        <div class="timeline-empty">Không tải được thống kê cầu thủ.</div>`;
    }
    root.requestAnimationFrame(() => refitBracket());
  }

  async function goToKoPlayerStatsPage(page) {
    if (koLeftOverlay !== "list" && koLeftOverlay !== "players") {
      return;
    }
    if (!Number.isFinite(page)) {
      return;
    }
    koPlayerStatsPage = Math.max(0, page);
    if (koLeftOverlay === "players") {
      await renderKoPlayerStatsView(koPlayerTab, koPlayerStatsPage);
      return;
    }
    await renderKoPlayerStatsEmbed();
  }

  async function switchKoPlayerTab(tab) {
    if (koLeftOverlay !== "list" && koLeftOverlay !== "players") {
      return;
    }
    if (tab === koPlayerTab) {
      return;
    }
    koPlayerTab = tab === "assists" ? "assists" : "goals";
    koPlayerStatsPage = 0;
    if (koLeftOverlay === "players") {
      await renderKoPlayerStatsView(koPlayerTab, 0);
      return;
    }
    await renderKoPlayerStatsEmbed();
  }

  async function refreshKoLeftDetail() {
    if (koLeftOverlay === "detail" && koSelectedBracketId) {
      await openKoMatchDetail(koSelectedBracketId, koDetailTab);
      return;
    }
    if (koLeftOverlay === "list") {
      renderKoMatchList();
    }
  }

  function adapter() {
    return root.WC26KnockoutAdapter || {};
  }

  function layout() {
    return root.WC26KnockoutLayout || {};
  }

  function fixturesApi() {
    return root.WC26KnockoutFixtures || {};
  }

  function readLocked() {
    return root.localStorage.getItem(LOCK_KEY) === "1";
  }

  function setLocked(v) {
    if (v) {
      root.localStorage.setItem(LOCK_KEY, "1");
    }
  }

  function shouldAutoSwitch() {
    if (readLocked()) {
      return true;
    }
    const a = adapter();
    const b = bridge();
    if (a.shouldAutoSwitchToKnockout) {
      return a.shouldAutoSwitchToKnockout(b);
    }
    if (!a.isGroupStageFinished || !a.getGroupStageEndTime) {
      return false;
    }
    return a.isGroupStageFinished(b) && Date.now() >= a.getGroupStageEndTime(b) + AUTO_DELAY_MS;
  }

  // Single source of truth for UTC -> Vietnam time conversion.
  // RULE: pass the original UTC ISO string only. NEVER call Intl.DateTimeFormat
  // on a string that has already been formatted by this function (would shift
  // the time again by the local-machine offset).
  function formatBracketTime(utc) {
    const b = bridge();
    const val = b.formatVietnamTime?.(utc);
    if (val) {
      return val;
    }
    if (!utc) {
      return "—";
    }
    // `utc` is the original UTC ISO timestamp from fixture.utc / event.utc.
    const d = new Date(utc);
    if (Number.isNaN(d.getTime())) {
      return "—";
    }
    const parts = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(d);
    const pick = (type) => parts.find((part) => part.type === type)?.value ?? "00";
    return `${pick("day")}/${pick("month")} ${pick("hour")}:${pick("minute")}`;
  }

  function logic() {
    return root.WC26Logic || {};
  }

  function koTeamShort(name) {
    const info = bridge().teamInfo?.[name];
    return info?.short || String(name || "").slice(0, 3).toUpperCase();
  }

  function getKoDisplayEntries() {
    const detail = matchDetailApi();
    const b = bridge();
    if (!bracketState || !detail.buildKnockoutDisplayMatch || !b.matchKey) {
      return [];
    }

    return (bracketState.matches || []).map((bracketMatch) => {
      const display = detail.buildKnockoutDisplayMatch(bracketMatch);
      if (!display) {
        return null;
      }
      return {
        bracketMatch,
        display,
        key: b.matchKey(display.home, display.away, display.utc)
      };
    }).filter(Boolean);
  }

  function getKoDisplayByKey(key) {
    if (!key) {
      return null;
    }
    return getKoDisplayEntries().find((entry) => entry.key === key) || null;
  }

  function getKoDisplayByBracketId(id) {
    if (!id) {
      return null;
    }
    return getKoDisplayEntries().find((entry) => entry.bracketMatch.id === id) || null;
  }

  function findKoLiveMatch() {
    const b = bridge();
    return getKoDisplayEntries().find((entry) => b.isLiveMatch?.(entry.display))?.display || null;
  }

  function koMatchPriority(match) {
    return bridge().isLiveMatch?.(match) ? 0 : 1;
  }

  function koNextMatches(now = Date.now()) {
    const upcomingFn = logic().isUpcomingOrLiveMatch;
    return getKoDisplayEntries()
      .map((entry) => entry.display)
      .filter((match) => (upcomingFn ? upcomingFn(match, now) : match))
      .sort((left, right) => {
        const priorityDiff = koMatchPriority(left) - koMatchPriority(right);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return Date.parse(left.utc) - Date.parse(right.utc);
      });
  }

  function getKoCenterMatch() {
    const resolve = logic().resolveCenterMatch;
    const matches = koNextMatches();
    const liveMatch = findKoLiveMatch();
    const getMatchByKey = (key) => getKoDisplayByKey(key)?.display || null;

    if (!resolve) {
      const fallback = liveMatch || matches[0] || null;
      const entry = fallback
        ? getKoDisplayEntries().find((item) => item.display === fallback)
        : null;
      koCenterBracketId = entry?.bracketMatch?.id || "";
      return fallback;
    }

    const result = resolve({
      matches,
      centerMatchKey: koCenterMatchKey,
      centerMatchPinned: koCenterMatchPinned,
      liveMatch,
      getMatchByKey
    });

    koCenterMatchKey = result.centerMatchKey || "";
    koCenterMatchPinned = Boolean(result.centerMatchPinned);
    koCenterBracketId = getKoDisplayByKey(koCenterMatchKey)?.bracketMatch?.id || "";
    return result.match || null;
  }

  function getKoFirstBracketMatch() {
    const roundPool = roundMatchesForPanel();
    const pool = roundPool.length ? roundPool : bracketR32Matches();
    return pool.find((match) => {
      const home = match.apiMatch?.homeTeam?.name || "";
      const away = match.apiMatch?.awayTeam?.name || "";
      return !isSlotLabel(home) || !isSlotLabel(away);
    }) || pool[0] || null;
  }

  function buildKoWidgetDisplayMatch(bracketMatch) {
    const detail = matchDetailApi();
    const resolved = detail.buildKnockoutDisplayMatch?.(bracketMatch);
    if (resolved) {
      return resolved;
    }

    const api = bracketMatch?.apiMatch;
    if (!api) {
      return null;
    }

    return {
      home: api.homeTeam.name,
      away: api.awayTeam.name,
      utc: api.matchTime || bracketMatch.utc,
      venue: api.venue || bracketMatch.venue || "",
      group: bracketMatch.round || "R32",
      completed: api.status === "FINISHED",
      inProgress: api.status === "LIVE",
      rawInProgress: api.status === "LIVE",
      homeScore: api.homeTeam.score,
      awayScore: api.awayTeam.score
    };
  }

  function resolveKoWidgetMatch() {
    const center = getKoCenterMatch();
    if (center) {
      return {
        match: center,
        bracketId: koCenterBracketId || getKoDisplayByKey(koCenterMatchKey)?.bracketMatch?.id || ""
      };
    }

    const first = getKoFirstBracketMatch();
    const display = buildKoWidgetDisplayMatch(first);
    if (!first || !display) {
      return null;
    }

    return {
      match: display,
      bracketId: first.id
    };
  }

  function resolveWallpaperAssetUrl(path) {
    if (!path) {
      return "";
    }
    if (/^(https?:|file:|data:|blob:)/i.test(path)) {
      return path;
    }
    try {
      const base = document.baseURI || root.location.href;
      return new URL(path, base).href;
    } catch (e) {
      return path;
    }
  }

  function resolveKoFlagUrl(name, teamId) {
    const b = bridge();
    const teamName = b.canonicalName ? b.canonicalName(name) : name;
    if (isSlotLabel(teamName)) {
      return "";
    }

    const info = b.teamInfo?.[teamName];
    if (info?.code) {
      return resolveWallpaperAssetUrl(`flags/${info.code}.png`);
    }

    if (b.flagPath) {
      const path = b.flagPath(teamName);
      if (path) {
        return resolveWallpaperAssetUrl(path);
      }
    }

    if (b.flagStyle) {
      const style = b.flagStyle(teamName);
      const matched = String(style).match(/url\(['"]?([^'")]+)['"]?\)/);
      if (matched?.[1]) {
        return resolveWallpaperAssetUrl(matched[1]);
      }
    }

    if (adapter().getFlagUrl) {
      const candidates = [teamId, koTeamShort(teamName), teamName].filter(Boolean);
      for (const candidate of candidates) {
        const url = adapter().getFlagUrl(candidate, b.teamInfo);
        if (url) {
          return resolveWallpaperAssetUrl(url);
        }
      }
    }

    return "";
  }

  function applyKoWidgetFlag(el, name, teamId) {
    if (!el) {
      return;
    }

    const url = resolveKoFlagUrl(name, teamId);
    if (url) {
      const flagValue = `url("${url}")`;
      el.style.setProperty("--flag", flagValue);
      el.style.backgroundImage = flagValue;
      el.classList.add("flag-img");
      el.classList.remove("is-empty");
      return;
    }

    el.style.removeProperty("--flag");
    el.style.backgroundImage = "";
    el.classList.remove("flag-img");
    el.classList.add("is-empty");
  }

  function setKoNextStageMode(isLive) {
    $("ko-next-countdown")?.classList.toggle("hidden", isLive);
    $("ko-next-live-strip")?.classList.toggle("hidden", !isLive);
    $("ko-next-match-stage")?.classList.toggle("is-live", isLive);
  }

  async function loadKoNextTimeline(match) {
    const listEl = $("ko-next-timeline-list");
    const detail = matchDetailApi();
    const b = bridge();
    if (!listEl || !match || !b.isLiveMatch?.(match) || !detail.fetchDisplayMatchSummary || !detail.renderMatchEventFeed) {
      return;
    }

    const requestKey = b.matchKey(match.home, match.away, match.utc);
    const minuteBucket = Math.floor((Number(match.statusClock) || 0) / 60);
    const fetchKey = `${requestKey}|${match.rawHomeScore}|${match.rawAwayScore}|${minuteBucket}`;
    const now = Date.now();
    const shouldFetch = fetchKey !== koTimelineFetchKey || now - koTimelineFetchAt >= KO_TIMELINE_FETCH_MS;
    if (!shouldFetch) {
      return;
    }

    koTimelineFetchKey = fetchKey;
    koTimelineFetchAt = now;

    const summary = await detail.fetchDisplayMatchSummary(match);
    const current = getKoDisplayByKey(requestKey)?.display;
    if (!current || !b.isLiveMatch?.(current) || !listEl) {
      return;
    }

    listEl.innerHTML = detail.renderMatchEventFeed(summary?.events || [], current, { showHead: true });
  }

  function updateKoNextLiveBoard(match) {
    const b = bridge();
    const detail = matchDetailApi();
    if (!match || !b.isLiveMatch?.(match)) {
      setKoNextStageMode(false);
      koTimelineFetchKey = "";
      const listEl = $("ko-next-timeline-list");
      if (listEl) {
        listEl.innerHTML = "";
      }
      return;
    }

    const scores = logic().getLiveDisplayScores?.(match) || {
      home: match.homeScore ?? 0,
      away: match.awayScore ?? 0
    };

    setKoNextStageMode(true);
    const homeScoreEl = $("ko-next-live-home-score");
    const awayScoreEl = $("ko-next-live-away-score");
    const homeShortEl = $("ko-next-live-home-short");
    const awayShortEl = $("ko-next-live-away-short");
    const minuteEl = $("ko-next-live-minute");

    if (homeScoreEl) homeScoreEl.textContent = scores.home;
    if (awayScoreEl) awayScoreEl.textContent = scores.away;
    if (homeShortEl) homeShortEl.textContent = koTeamShort(match.home);
    if (awayShortEl) awayShortEl.textContent = koTeamShort(match.away);
    if (minuteEl) {
      minuteEl.textContent = detail.liveMinuteText?.(match) || b.liveMinuteText?.(match) || "Đang đá";
    }

    loadKoNextTimeline(match);
  }

  function renderKoLocalClock() {
    const clockEl = $("ko-local-clock");
    const b = bridge();
    if (!clockEl) {
      return;
    }

    if (b.formatVnDateTime) {
      clockEl.textContent = `Giờ VN · ${b.formatVnDateTime(new Date())}`;
      return;
    }

    clockEl.textContent = `Giờ VN · ${formatBracketTime(new Date().toISOString())}`;
  }

  function updateKoNextMatch() {
    const stage = $("ko-next-match-stage");
    if (!stage || !knockoutVisible) {
      return;
    }

    const b = bridge();
    const resolved = resolveKoWidgetMatch();
    const match = resolved?.match || null;
    koWidgetBracketId = resolved?.bracketId || "";
    const homeFlagEl = $("ko-next-home-flag");
    const awayFlagEl = $("ko-next-away-flag");
    const homeNameEl = $("ko-next-home-name");
    const awayNameEl = $("ko-next-away-name");
    const roundEl = $("ko-next-round");
    const labelEl = $("ko-next-vs-label");
    const titleEl = $("ko-next-title");
    const timeEl = $("ko-next-time");
    const hoursEl = $("ko-next-hours");
    const minutesEl = $("ko-next-minutes");
    const secondsEl = $("ko-next-seconds");

    renderKoLocalClock();

    if (!match) {
      lastKoNextIdentity = "";
      if (homeFlagEl) homeFlagEl.style.removeProperty("--flag");
      if (awayFlagEl) awayFlagEl.style.removeProperty("--flag");
      if (homeNameEl) homeNameEl.textContent = "World Cup";
      if (awayNameEl) awayNameEl.textContent = "2026";
      if (roundEl) roundEl.textContent = "KNOCKOUT";
      if (labelEl) labelEl.textContent = "Hết giờ";
      if (titleEl) titleEl.textContent = "Không còn trận sắp diễn ra";
      if (timeEl) timeEl.textContent = "—";
      setKoNextStageMode(false);
      if (hoursEl) hoursEl.textContent = "00";
      if (minutesEl) minutesEl.textContent = "00";
      if (secondsEl) secondsEl.textContent = "00";
      return;
    }

    const identity = b.matchKey?.(match.home, match.away, match.utc) || "";
    const entry = getKoDisplayByBracketId(koWidgetBracketId) || getKoDisplayByKey(identity);
    const roundLabel = ROUND_LABELS[entry?.bracketMatch?.round] || match.group || "KNOCKOUT";
    const live = b.isLiveMatch?.(match);

    if (identity !== lastKoNextIdentity) {
      lastKoNextIdentity = identity;
      if (homeNameEl) homeNameEl.textContent = match.home;
      if (awayNameEl) awayNameEl.textContent = match.away;
    }

    applyKoWidgetFlag(homeFlagEl, match.home, resolveKoWidgetTeamId(match, "home", entry));
    applyKoWidgetFlag(awayFlagEl, match.away, resolveKoWidgetTeamId(match, "away", entry));

    if (roundEl) {
      roundEl.textContent = live ? `${roundLabel} · TRỰC TIẾP` : roundLabel;
    }
    if (labelEl) {
      labelEl.textContent = live ? "Đang diễn ra" : "Kick-Off";
    }
    if (titleEl) {
      const score = b.scoreText?.(match);
      titleEl.textContent = live || (match.completed && score !== "vs")
        ? `${match.home} ${score} ${match.away}`
        : `${match.home} vs ${match.away}`;
    }
    if (timeEl) {
      const utcValue = match.utc;
      const timeText = b.formatVietnamTime?.(utcValue) || formatBracketTime(utcValue) || "—";
      timeEl.textContent = live
        ? `${b.liveMinuteText?.(match) || "LIVE"} · ${match.venue || "—"}`
        : `Giờ VN ${timeText} · ${match.venue || "—"}`;
    }

    updateKoNextLiveBoard(match);

    if (live) {
      return;
    }

    const now = Date.now();
    const target = Date.parse(match.utc) > now ? Date.parse(match.utc) : now;
    const remaining = Math.max(0, target - now);
    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");

    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
  }

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

  function resolveKoWidgetTeamId(match, side, entry) {
    const bracketMatch = entry?.bracketMatch || getBracketMatchById(koWidgetBracketId || koCenterBracketId);
    const apiTeam = bracketMatch?.apiMatch?.[side === "home" ? "homeTeam" : "awayTeam"];
    if (apiTeam?.id && !isSlotLabel(apiTeam.id)) {
      return apiTeam.id;
    }
    return side === "home" ? match?.home : match?.away;
  }

  function koPanelTeamPresentation(team, b) {
    const slot = isSlotLabel(team?.name) || team?.qualStatus === "slot";
    const predicted = team?.qualStatus === "predicted";
    const displayName = slot
      ? (team?.slotLabel || team?.name || "TBD")
      : (b.canonicalName ? b.canonicalName(team.name) : team.name);
    let flagId = "";

    if (!slot) {
      flagId = team?.id && !isSlotLabel(team.id) ? team.id : koTeamShort(displayName);
    }

    return {
      displayName,
      flagName: slot ? "" : displayName,
      flagId,
      slot,
      predicted
    };
  }

  function koFlagDataAttrs(teamName, teamId) {
    const safeName = String(teamName || "").replace(/"/g, "&quot;");
    const safeId = String(teamId || "").replace(/"/g, "&quot;");
    return `data-ko-flag-team="${safeName}" data-ko-flag-id="${safeId}"`;
  }

  function applyKoPanelFlags(scopeEl) {
    if (!scopeEl) {
      return;
    }

    scopeEl.querySelectorAll(".flag-img[data-ko-flag-team]").forEach((el) => {
      const name = el.dataset.koFlagTeam || "";
      if (!name || isSlotLabel(name)) {
        el.style.removeProperty("--flag");
        el.style.backgroundImage = "";
        el.classList.add("is-empty");
        return;
      }
      applyKoWidgetFlag(el, name, el.dataset.koFlagId);
    });
  }

  function renderKoListScoreRow(home, away, centerText, homeId, awayId, homeStatus, awayStatus) {
    const b = bridge();
    const homeMeta = koPanelTeamPresentation({ name: home, id: homeId, qualStatus: homeStatus }, b);
    const awayMeta = koPanelTeamPresentation({ name: away, id: awayId, qualStatus: awayStatus }, b);
    const homePredicted = homeMeta.predicted ? " is-predicted" : "";
    const awayPredicted = awayMeta.predicted ? " is-predicted" : "";
    return `
      <div class="history-match-team home">
        ${homeMeta.slot ? "" : `<span class="flag-img" ${koFlagDataAttrs(homeMeta.flagName, homeMeta.flagId)} aria-hidden="true"></span>`}
        <span class="history-match-team-name${homePredicted}${homeMeta.slot ? " is-slot" : ""}">${homeMeta.displayName}</span>
      </div>
      <div class="history-match-result">${centerText}</div>
      <div class="history-match-team away">
        <span class="history-match-team-name${awayPredicted}${awayMeta.slot ? " is-slot" : ""}">${awayMeta.displayName}</span>
        ${awayMeta.slot ? "" : `<span class="flag-img" ${koFlagDataAttrs(awayMeta.flagName, awayMeta.flagId)} aria-hidden="true"></span>`}
      </div>`;
  }

  function formatScoreText(team, showScores) {
    if (!showScores || team.score === null || team.score === undefined) {
      return "";
    }
    if (team.penaltyScore !== null && team.penaltyScore !== undefined) {
      return `${team.score} <span class="ko-pen">(${team.penaltyScore})</span>`;
    }
    return String(team.score);
  }

  function renderTeamRow(side, match, teamKey, showScores) {
    const api = match.apiMatch;
    const team = teamKey === "home" ? api.homeTeam : api.awayTeam;
    const b = bridge();
    const slot = isSlotLabel(team.name) || team.qualStatus === "slot";
    const predicted = team.qualStatus === "predicted";
    const displayName = !slot && b.canonicalName ? b.canonicalName(team.name) : team.name;
    const scoreHtml = formatScoreText(team, showScores);
    const winner = match.winnerName === team.name;
    const flagName = slot ? "" : displayName;
    const flagId = slot ? "" : (team.id && !isSlotLabel(team.id) ? team.id : koTeamShort(displayName));

    const rowClass = `${side}${slot ? " is-slot" : ""}${predicted ? " is-predicted" : ""}${winner ? " is-winner" : ""}${match.wing === "right" ? " is-right-wing" : ""}`;
    const showSlotHint = team.slotLabel
      && team.name !== team.slotLabel
      && !isSlotLabel(team.name)
      && team.qualStatus !== "confirmed"
      && team.qualStatus !== "predicted";
    const slotHint = showSlotHint
      ? `<span class="ko-slot-hint">${team.slotLabel}</span>`
      : "";
    return `
      <div class="ko-v2-team ${rowClass}">
        ${slot ? "" : `<span class="flag-img" ${koFlagDataAttrs(flagName, flagId)} aria-hidden="true"></span>`}
        <span class="team-name">${displayName}${slotHint}${predicted ? '<span class="ko-qual-tag">Dự đoán</span>' : ""}</span>
        ${scoreHtml ? `<span class="ko-score">${scoreHtml}</span>` : ""}
      </div>`;
  }

  function renderMatchCard(match) {
    const api = match.apiMatch;
    const live = api.status === "LIVE";
    const wh = match.winnerName === api.homeTeam.name;
    const wa = match.winnerName === api.awayTeam.name;
    const isFinal = match.round === "F";
    const showScores = api.status !== "SCHEDULED"
      && (api.homeTeam.score !== null && api.homeTeam.score !== undefined
        || api.awayTeam.score !== null && api.awayTeam.score !== undefined);
    const venue = api.venue || match.venue || "";
    const venueFull = venue || "—";
    const venueShort = formatBracketVenue(venue);
    const timeText = live ? api.matchClock || "LIVE" : formatBracketTime(match.utc || api.matchTime);

    return `
      <article class="knockout-match ko-v2-match${live ? " is-live" : ""}${isFinal ? " is-final" : ""}${wh ? " is-winner-home" : ""}${wa ? " is-winner-away" : ""}"
        data-match-id="${match.id}" id="match-${match.id}">
        ${renderTeamRow("home", match, "home", showScores)}
        ${renderTeamRow("away", match, "away", showScores)}
        <div class="ko-v2-time">
          <span class="ko-v2-time-clock">${timeText}</span>
          <span class="ko-v2-time-venue" title="${venueFull}">${venueShort}</span>
        </div>
      </article>`;
  }

  function sortRoundMatches(roundMatches, wing, round) {
    const order = fixturesApi().BRACKET_COLUMN_ORDER?.[wing]?.[round];
    if (!order) {
      return roundMatches;
    }
    const rank = new Map(order.map((id, index) => [id, index]));
    return roundMatches.slice().sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : 999;
      const bi = rank.has(b.id) ? rank.get(b.id) : 999;
      return ai - bi;
    });
  }

  function renderWing(container, wing) {
    if (!container) {
      return;
    }

    const rounds = fixturesApi().WING_COLUMN_ROUNDS?.[wing] || ["R32", "R16", "QF", "SF"];
    const matches = (bracketState?.matches || []).filter((m) => m.wing === wing);
    container.innerHTML = rounds.map((round) => {
      const roundMatches = sortRoundMatches(matches.filter((m) => m.round === round), wing, round);
      if (!roundMatches.length) {
        return "";
      }
      return `
        <div class="ko-v2-round-col" data-round="${round}" data-wing="${wing}">
          <div class="ko-v2-round-label">${ROUND_LABELS[round] || round}</div>
          <div class="ko-v2-round-stack">
            ${roundMatches.map((m) => renderMatchCard(m)).join("")}
          </div>
        </div>`;
    }).join("");
  }

  function renderHub(container) {
    if (!container) {
      return;
    }
    const finalM = bracketState?.byId?.F;
    const tpM = bracketState?.byId?.TP;
    container.innerHTML = `
      <div class="ko-v2-hub-stack">
        ${finalM ? `<div class="ko-v2-hub-block ko-v2-hub-final">
          <div class="ko-v2-hub-title">WORLD CHAMPIONS</div>
          <div class="ko-v2-round-label">${ROUND_LABELS.F}</div>
          ${renderMatchCard(finalM)}
        </div>` : ""}
        <div class="ko-v2-trophy-hero" aria-hidden="true">
          <img class="trophy-image" src="assets/world-cup-trophy.png" alt="">
        </div>
        ${tpM ? `<div class="ko-v2-hub-block ko-v2-hub-tp">
          <div class="ko-v2-hub-title">BRONZE WINNER</div>
          <div class="ko-v2-round-label">${ROUND_LABELS.TP}</div>
          ${renderMatchCard(tpM)}
        </div>` : ""}
      </div>`;
  }

  function renderBracket() {
    updateBracketViewportVars();
    renderWing($("ko-wing-left"), "left");
    renderWing($("ko-wing-right"), "right");
    renderHub($("ko-wing-center"));
    applyKoPanelFlags($("ko-bracket-stage"));
    root.requestAnimationFrame(() => refitBracket());
  }

  function updateBracketViewportVars() {
    const inner = document.querySelector(".knockout-page.ko-v2-inner, .ko-v2-inner");
    const footer = document.querySelector(".ko-v2-footer");
    if (!inner) {
      return;
    }
    const footerH = footer?.offsetHeight || 0;
    const innerStyle = root.getComputedStyle(inner);
    const headerH = parseFloat(innerStyle.paddingTop) + 16;
    inner.style.setProperty("--ko-footer-h", `${footerH}px`);
    inner.style.setProperty("--ko-header-h", `${headerH}px`);
  }

  function refitBracket() {
    if (!knockoutVisible || !bracketState) {
      return;
    }
    updateBracketViewportVars();
    const lay = layout();
    const pairs = fixturesApi().buildConnectorPairs
      ? fixturesApi().buildConnectorPairs()
      : (fixturesApi().CONNECTOR_PAIRS || []);
    if (lay.scheduleConnectorDraw) {
      lay.scheduleConnectorDraw({
        svgEl: $("knockout-connectors"),
        stageEl: $("ko-bracket-stage"),
        scrollEl: $("ko-bracket-scroll"),
        pairs,
        columnOrder: fixturesApi().BRACKET_COLUMN_ORDER || {},
        bracketState
      });
      return;
    }
    if (lay.applyBracketMetrics && lay.drawConnectors) {
      lay.applyBracketMetrics($("ko-bracket-scroll"), $("ko-bracket-stage"));
      if (lay.layoutTreeBracket) {
        lay.layoutTreeBracket(
          $("ko-bracket-stage"),
          pairs,
          fixturesApi().BRACKET_COLUMN_ORDER || {},
          $("ko-bracket-scroll")
        );
      }
      lay.drawConnectors({
        svgEl: $("knockout-connectors"),
        stageEl: $("ko-bracket-stage"),
        pairs,
        bracketState,
        compact: root.innerWidth <= 1920 || root.innerHeight <= 1080
      });
    }
  }

  function roundMatchesForPanel() {
    const activeRounds = new Set(getKoListActiveRounds());
    return interleaveWingMatches(
      (bracketState?.matches || []).filter((match) => activeRounds.has(match.round))
    );
  }

  function bracketR32Matches() {
    return interleaveWingMatches(
      (bracketState?.matches || []).filter((match) => match.round === "R32")
    );
  }

  function upcomingMatches() {
    return roundMatchesForPanel();
  }

  function getKoUpcomingPageCount() {
    const total = upcomingMatches().length;
    return Math.max(1, Math.ceil(total / KO_UPCOMING_PAGE_SIZE));
  }

  function syncKoUpcomingPageUi() {
    const pageCount = getKoUpcomingPageCount();
    if (koUpcomingPage >= pageCount) {
      koUpcomingPage = 0;
    }

    const controls = $("ko-upcoming-page-controls");
    if (!controls) {
      return;
    }

    controls.classList.toggle("is-hidden", pageCount <= 1);
    controls.innerHTML = Array.from({ length: pageCount }, (_, index) => `
      <button class="group-button${index === koUpcomingPage ? " active" : ""}" type="button"
        data-ko-upcoming-page="${index}" aria-label="Trang ${index + 1}"
        aria-current="${index === koUpcomingPage ? "true" : "false"}">${index + 1}</button>`).join("");
  }

  function setKoUpcomingPage(page) {
    const next = Math.max(0, Math.min(getKoUpcomingPageCount() - 1, page));
    if (next === koUpcomingPage) {
      return;
    }
    koUpcomingPage = next;
    syncKoUpcomingPageUi();
    renderUpcoming();
  }

  function upcomingMatchesForPage() {
    const all = upcomingMatches();
    const pageCount = getKoUpcomingPageCount();
    const page = Math.min(koUpcomingPage, pageCount - 1);
    const start = page * KO_UPCOMING_PAGE_SIZE;
    return all.slice(start, start + KO_UPCOMING_PAGE_SIZE);
  }

  function koTeamShort(name) {
    const info = bridge().teamInfo?.[name];
    if (info?.short) {
      return info.short;
    }
    return String(name || "").slice(0, 3).toUpperCase();
  }

  function koUpcomingCenterText(api) {
    const b = bridge();
    if (api.status === "LIVE") {
      return b.liveMinuteText?.(api) || "LIVE";
    }
    return "vs";
  }

  function renderUpcoming() {
    const el = $("ko-upcoming");
    if (!el) {
      return;
    }
    syncKoUpcomingPageUi();
    const list = upcomingMatchesForPage();
    const b = bridge();
    const meta = getKoListPageMeta();
    if (!list.length) {
      el.innerHTML = `<div class="empty-state">Chưa có lịch ${ROUND_LABELS[meta.id] || meta.label}.</div>`;
      return;
    }

    el.innerHTML = list.map((m) => {
      const api = m.apiMatch;
      const homeMeta = koPanelTeamPresentation(api.homeTeam, b);
      const awayMeta = koPanelTeamPresentation(api.awayTeam, b);
      const live = api.status === "LIVE";
      const finished = api.status === "FINISHED";
      const roundLabel = ROUND_LABELS[m.round] || m.round;
      const timeUtc = live ? (api.matchTime || m.utc) : m.utc;
      const timeText = b.formatVietnamTime?.(timeUtc) || formatBracketTime(timeUtc) || "—";
      const timeLabel = live
        ? `${api.matchClock || "LIVE"} · TRỰC TIẾP`
        : finished
          ? `FT · ${timeText}`
          : `Giờ VN ${timeText}`;
      let centerText = koUpcomingCenterText(api);
      if (finished && api.homeTeam.score != null && api.awayTeam.score != null) {
        centerText = `${api.homeTeam.score}-${api.awayTeam.score}`;
      }
      const footerCodes = homeMeta.slot || awayMeta.slot
        ? `${homeMeta.displayName} - ${awayMeta.displayName}`
        : `${koTeamShort(homeMeta.displayName)} - ${koTeamShort(awayMeta.displayName)}`;

      return `
        <article class="match-card is-clickable${live ? " is-live" : ""}${finished ? " is-finished" : ""}"
          data-ko-bracket-id="${m.id}" role="button" tabindex="0"
          aria-label="${homeMeta.displayName} vs ${awayMeta.displayName}">
          <div class="match-row">
            <div class="match-team">
              ${homeMeta.slot ? "" : `<span class="flag-img" ${koFlagDataAttrs(homeMeta.flagName, homeMeta.flagId)} aria-hidden="true"></span>`}
              <span class="match-team-name${homeMeta.predicted ? " is-predicted" : ""}${homeMeta.slot ? " is-slot" : ""}">${homeMeta.displayName}</span>
            </div>
            <div class="match-v">${centerText}</div>
            <div class="match-team away">
              <span class="match-team-name${awayMeta.predicted ? " is-predicted" : ""}${awayMeta.slot ? " is-slot" : ""}">${awayMeta.displayName}</span>
              ${awayMeta.slot ? "" : `<span class="flag-img" ${koFlagDataAttrs(awayMeta.flagName, awayMeta.flagId)} aria-hidden="true"></span>`}
            </div>
          </div>
          <div class="match-time">
            <span>${roundLabel}</span>
            <span>${timeText}</span>
          </div>
          <div class="match-time">
            <span>${api.venue || m.venue || "—"}</span>
            <span>${footerCodes}</span>
          </div>
        </article>`;
    }).join("");
    root.requestAnimationFrame(() => applyKoPanelFlags(el));
    root.requestAnimationFrame(() => refitBracket());
  }

  function renderLeftPanel() {
    if (koLeftOverlay === "list") {
      renderKoMatchList();
      return;
    }
    if (koLeftOverlay === "players") {
      renderKoPlayerStatsView(koPlayerTab, koPlayerStatsPage);
      return;
    }
    if (koLeftOverlay === "detail" && koSelectedBracketId) {
      refreshKoLeftDetail();
    }
  }

  function renderAll() {
    if (!bracketState) {
      return;
    }

    const key = bracketState.matches.map((m) => [
      m.id,
      m.apiMatch?.status,
      m.apiMatch?.homeTeam?.name,
      m.apiMatch?.awayTeam?.name,
      m.apiMatch?.homeTeam?.qualStatus,
      m.apiMatch?.awayTeam?.qualStatus,
      m.apiMatch?.homeTeam?.score,
      m.apiMatch?.awayTeam?.score,
      m.winnerName
    ].join(":")).join("|");

    if (key === lastRenderKey) {
      updateKoNextMatch();
      if (koLeftOverlay === "list") {
        renderKoMatchList();
      }
      return;
    }

    lastRenderKey = key;
    renderBracket();
    renderUpcoming();
    renderLeftPanel();
    updateKoNextMatch();

    const statusEl = $("knockout-data-status");
    if (statusEl) {
      const gsStatus = document.getElementById("dataStatus")?.textContent?.trim();
      const deployBuild = root.WC26_DEPLOY?.build || "";
      const baseStatus = [gsStatus, deployBuild].filter(Boolean).join(" · ")
        || (readLocked() ? "KNOCKOUT" : "PREVIEW");
      const roundMatches = roundMatchesForPanel();
      const resolved = roundMatches.filter((match) => {
        const home = match.apiMatch?.homeTeam?.name || "";
        const away = match.apiMatch?.awayTeam?.name || "";
        return !isSlotLabel(home) || !isSlotLabel(away);
      }).length;
      statusEl.textContent = roundMatches.length
        ? `${baseStatus} · ${resolved}/${roundMatches.length} trận`
        : baseStatus;
    }
  }

  function onBracketUpdate(state) {
    bracketState = state;
    renderAll();
  }

  function setKnockoutActive(active) {
    document.querySelector(".wallpaper")?.classList.toggle("is-knockout-active", active);
  }

  function updateNav(manual) {
    $("knockout-back-btn")?.classList.toggle("hidden", !manual);
    $("knockout-entry-btn")?.classList.toggle("hidden", readLocked());
  }

  function bindResizeObserver() {
    if (!root.ResizeObserver) {
      return;
    }
    const targets = [
      $("ko-bracket-scroll"),
      $("ko-bracket-stage"),
      document.querySelector(".knockout-page .knockout-panel--left"),
      document.querySelector(".knockout-page .upcoming-matches-panel")
    ].filter(Boolean);

    if (!resizeObserver) {
      resizeObserver = new root.ResizeObserver(() => refitBracket());
    }

    targets.forEach((el) => {
      if (!resizeObserveTargets.includes(el)) {
        resizeObserver.observe(el);
        resizeObserveTargets.push(el);
      }
    });

    if (!windowResizeBound) {
      root.addEventListener("resize", refitBracket);
      windowResizeBound = true;
    }
    if (!orientationBound) {
      root.addEventListener("orientationchange", refitBracket);
      orientationBound = true;
    }
  }

  function unbindResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
      resizeObserveTargets.length = 0;
    }
    if (windowResizeBound) {
      root.removeEventListener("resize", refitBracket);
      windowResizeBound = false;
    }
    if (orientationBound) {
      root.removeEventListener("orientationchange", refitBracket);
      orientationBound = false;
    }
  }

  async function loadMarkup() {
    const screen = $("knockout-screen");
    if (!screen) {
      return;
    }

    if (screen.dataset.markupVersion !== MARKUP_VERSION) {
      let html = EMBEDDED_MARKUP;
      try {
        const res = await fetch("knockout/knockout.html", { cache: "no-store" });
        if (res.ok) {
          const fetched = await res.text();
          if (fetched.includes("ko-wing-left")) {
            html = fetched;
          }
        }
      } catch (e) {
        // embedded fallback
      }

      screen.innerHTML = html;
      screen.dataset.markupVersion = MARKUP_VERSION;
      unbindResizeObserver();
    }

    bindResizeObserver();
  }

  async function switchToKnockout(options) {
    const manual = Boolean(options?.manual);
    await loadMarkup();

    const gs = $("group-stage-screen");
    const ko = $("knockout-screen");
    if (!gs || !ko) {
      return;
    }

    if (shouldAutoSwitch() && !manual) {
      setLocked(true);
    }

    knockoutVisible = true;
    setKnockoutActive(true);
    gs.classList.add("hidden");
    ko.classList.remove("hidden");
    updateNav(manual && !readLocked());

    lastRenderKey = "";
    koLeftOverlay = "list";
    koSelectedBracketId = "";
    koListRoundPage = 0;
    koCenterMatchKey = "";
    koCenterMatchPinned = false;
    koCenterBracketId = "";
    koWidgetBracketId = "";
    lastKoNextIdentity = "";
    lastKoLiveScoresKey = "";
    koPlayerStatsLeaders = null;
    koPlayerStatsPage = 0;
    koPlayerTab = "goals";
    koPlayedPage = 0;
    showKoLeftList();
    syncKoListRoundUi();
    if (!poller && adapter().createBracketPoller) {
      poller = adapter().createBracketPoller(bridge(), onBracketUpdate, 60000);
    } else if (adapter().buildBracketState) {
      onBracketUpdate(adapter().buildBracketState(bridge()));
    }

    startUiTick();
  }

  function switchToGroupStage() {
    knockoutVisible = false;
    setKnockoutActive(false);
    $("knockout-screen")?.classList.add("hidden");
    $("group-stage-screen")?.classList.remove("hidden");
    unbindResizeObserver();
    stopUiTick();
  }

  function selectKoNextMatch(bracketId, options = {}) {
    const entry = getKoDisplayByBracketId(bracketId);
    const b = bridge();
    if (!entry || !b.matchKey) {
      return;
    }

    const openDetail = options.openDetail === false
      ? false
      : canOpenKoMatchDetail(entry.bracketMatch);

    koCenterMatchKey = entry.key;
    koCenterBracketId = bracketId;
    koCenterMatchPinned = true;
    updateKoNextMatch();

    if (openDetail) {
      openKoMatchDetail(bracketId);
    }
  }

  function refreshKnockoutFromLive() {
    const b = bridge();
    if (!knockoutVisible || !adapter().buildBracketState) {
      return;
    }

    if (typeof WC26_DEBUG !== "undefined" && WC26_DEBUG) {
      validateFixtureDates(bracketState?.matches || []);
    }

    const freshState = adapter().buildBracketState(b);
    if (!freshState) {
      return;
    }

    if (b.getStandingsKey) {
      const standingsKey = b.getStandingsKey();
      if (standingsKey !== lastStandingsKey) {
        lastStandingsKey = standingsKey;
        lastRenderKey = "";
      }
    }

    bracketState = freshState;
    lastRenderKey = "";
    if (koLeftOverlay === "detail" && koSelectedBracketId) {
      renderBracket();
      renderUpcoming();
      refreshKoLeftDetail();
      updateKoNextMatch();
      return;
    }

    renderAll();
  }

  function tickKnockoutUi() {
    if (!knockoutVisible) {
      return;
    }

    // Consume any pending ESPN fetch success signals that arrived since the last
    // tick. After a fresh ESPN fetch populates liveData with new match events
    // (including the correct utc timestamps), we must rebuild the bracket state
    // so those fresh event times flow into the card render instead of stale
    // fixture.utc values that were carried over from before the match existed
    // in the live-data feed.
    if (pendingKnockoutRebuild) {
      pendingKnockoutRebuild = false;
      refreshKnockoutFromLive();
    }

    const b = bridge();
    if (shouldAutoSwitch()) {
      setLocked(true);
      updateNav(false);
    }

    const scoresKey = b.getLiveScoresKey?.() || "";
    if (scoresKey !== lastKoLiveScoresKey) {
      lastKoLiveScoresKey = scoresKey;
      refreshKnockoutFromLive();
      return;
    }

    const refreshMs = b.getLiveRefreshIntervalMs?.() || 60000;
    if (b.loadLiveData && Date.now() - lastKoLiveFetchAt >= refreshMs) {
      lastKoLiveFetchAt = Date.now();
      const fetchLive = b.loadLiveData();
      if (fetchLive && typeof fetchLive.then === "function") {
        fetchLive.then(() => {
          if (!knockoutVisible) {
            return;
          }
          const nextKey = b.getLiveScoresKey?.() || "";
          if (nextKey !== lastKoLiveScoresKey) {
            lastKoLiveScoresKey = nextKey;
          }
          refreshKnockoutFromLive();
        }).catch(() => {
          updateKoNextMatch();
        });
        return;
      }
    }

    updateKoNextMatch();
  }

  function startUiTick() {
    stopUiTick();
    tickKnockoutUi();
    tickTimer = root.setInterval(tickKnockoutUi, 1000);
  }

  function stopUiTick() {
    if (tickTimer) {
      root.clearInterval(tickTimer);
      tickTimer = 0;
    }
  }

  function bindEvents() {
    $("knockout-entry-btn")?.addEventListener("click", () => switchToKnockout({ manual: true }));

    // After every fresh ESPN fetch, rebuild the bracket state so newly-arrived
    // live events (with correct utc timestamps) flow into the card render.
    root.addEventListener("wc26-live-data-refreshed", () => {
      pendingKnockoutRebuild = true;
    });

    $("knockout-screen")?.addEventListener("click", (e) => {
      if (e.target.closest("#knockout-back-btn")) {
        switchToGroupStage();
        return;
      }

      const listRoundBtn = e.target.closest("[data-ko-list-round]");
      if (listRoundBtn) {
        setKoListRoundPage(Number(listRoundBtn.dataset.koListRound));
        return;
      }

      const upcomingPageBtn = e.target.closest("[data-ko-upcoming-page]");
      if (upcomingPageBtn) {
        setKoUpcomingPage(Number(upcomingPageBtn.dataset.koUpcomingPage));
        return;
      }

      const playedPageBtn = e.target.closest("[data-ko-played-page]");
      if (playedPageBtn) {
        setKoPlayedPage(Number(playedPageBtn.dataset.koPlayedPage));
        return;
      }

      const playedNavBtn = e.target.closest("[data-ko-played-nav]");
      if (playedNavBtn && !playedNavBtn.disabled) {
        stepKoPlayedPage(playedNavBtn.dataset.koPlayedNav === "next" ? 1 : -1);
        return;
      }

      const fixtureCard = e.target.closest("[data-ko-bracket-id]");
      if (fixtureCard) {
        selectKoNextMatch(fixtureCard.dataset.koBracketId);
        return;
      }

      const bracketCard = e.target.closest(".ko-v2-match[data-match-id]");
      if (bracketCard) {
        const bracketId = bracketCard.dataset.matchId;
        if (getKoDisplayByBracketId(bracketId)) {
          selectKoNextMatch(bracketId);
        }
        return;
      }

      if (e.target.closest("#ko-next-match-stage")) {
        const bracketId = koWidgetBracketId || koCenterBracketId;
        if (bracketId) {
          selectKoNextMatch(bracketId);
        }
        return;
      }

      const leftScroll = e.target.closest("#ko-left-scroll");
      if (!leftScroll) {
        return;
      }

      if (e.target.closest('[data-action="back-ko-list"]')) {
        showKoLeftList();
        return;
      }

      if (e.target.closest('[data-action="open-ko-player-stats"]')) {
        switchKoPlayerTab("goals");
        return;
      }

      const playerTab = e.target.closest("[data-player-tab]");
      if (playerTab && (koLeftOverlay === "players" || e.target.closest("#ko-player-stats-embed"))) {
        switchKoPlayerTab(playerTab.dataset.playerTab);
        return;
      }

      const playerPage = e.target.closest("[data-ko-player-page]");
      if (playerPage && (koLeftOverlay === "players" || e.target.closest("#ko-player-stats-embed"))) {
        goToKoPlayerStatsPage(Number(playerPage.dataset.koPlayerPage));
        return;
      }

      const playerNavBtn = e.target.closest("[data-ko-player-nav]");
      if (playerNavBtn && !playerNavBtn.disabled
        && (koLeftOverlay === "players" || e.target.closest("#ko-player-stats-embed"))) {
        stepKoPlayerStatsPage(playerNavBtn.dataset.koPlayerNav === "next" ? 1 : -1);
        return;
      }

      const matchRow = e.target.closest("[data-ko-match-id]");
      if (matchRow) {
        selectKoNextMatch(matchRow.dataset.koMatchId);
        return;
      }

      const detailTabButton = e.target.closest("[data-detail-tab]");
      if (detailTabButton && koLeftOverlay === "detail") {
        switchKoDetailTab(detailTabButton.dataset.detailTab);
      }
    });

    $("knockout-screen")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }

      const bracketCard = e.target.closest(".ko-v2-match[data-match-id]");
      if (bracketCard) {
        e.preventDefault();
        const bracketId = bracketCard.dataset.matchId;
        if (getKoDisplayByBracketId(bracketId)) {
          selectKoNextMatch(bracketId);
        }
        return;
      }

      if (e.target.closest("#ko-next-match-stage")) {
        const bracketId = koWidgetBracketId || koCenterBracketId;
        if (bracketId) {
          e.preventDefault();
          selectKoNextMatch(bracketId);
        }
        return;
      }

      const fixtureCard = e.target.closest("[data-ko-bracket-id]");
      if (fixtureCard) {
        e.preventDefault();
        selectKoNextMatch(fixtureCard.dataset.koBracketId);
      }
    });
  }

  async function init() {
    if (initialized) {
      return;
    }
    initialized = true;
    bindEvents();
    updateNav(false);

    if (shouldAutoSwitch()) {
      await switchToKnockout({ manual: false });
      return;
    }

    const params = new URLSearchParams(root.location.search);
    if (params.get("ko") === "1") {
      await switchToKnockout({ manual: true });
      return;
    }

    root.setInterval(() => {
      if (!knockoutVisible && shouldAutoSwitch()) {
        switchToKnockout({ manual: false });
      }
    }, 30000);
  }

  root.WC26Knockout = {
    init,
    switchToKnockout,
    switchToGroupStage,
    renderBracket: renderAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
