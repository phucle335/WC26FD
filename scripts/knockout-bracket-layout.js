(function (root) {
  const FONT_MAIN = 11;
  const FONT_SM = 10.5;
  const LABEL_H = 14;
  const TITLE_PAD = 15;
  const SCROLL_BREAK_W = 1600;
  const HUB_GAP = 18;
  const HUB_TROPHY = 90;
  const HUB_SHIFT_Y = 40;
  const VERTICAL_TOP_INSET = 12;
  const BRACKET_CHROME = 220;

  const DEFAULT_PROFILE = {
    matchH: 62,
    slotGapR32: 8,
    slotGapR16: 8,
    slotGapQF: 8,
    slotGapSF: 8,
    wingTopInset: 14,
    verticalCompress: 0.91,
    distributeEvenly: false,
    compact: false
  };

  const COMPACT_WIDTH_PROFILE = {
    matchH: 48,
    slotGapR32: 12,
    slotGapR16: 24,
    slotGapQF: 42,
    slotGapSF: 72,
    wingTopInset: 8,
    verticalCompress: 1,
    distributeEvenly: true,
    compact: true
  };

  const COMPACT_HEIGHT_PROFILE = {
    matchH: 48,
    slotGapR32: 10,
    slotGapR16: 20,
    slotGapQF: 36,
    slotGapSF: 60,
    wingTopInset: 4,
    verticalCompress: 1,
    distributeEvenly: true,
    compact: true
  };

  function offsetRect(el, ancestor) {
    const elRect = el.getBoundingClientRect();
    const ancestorRect = ancestor.getBoundingClientRect();
    return {
      left: elRect.left - ancestorRect.left,
      top: elRect.top - ancestorRect.top,
      right: elRect.right - ancestorRect.left,
      bottom: elRect.bottom - ancestorRect.top,
      width: elRect.width,
      height: elRect.height
    };
  }

  function midY(rect) {
    return rect.top + rect.height / 2;
  }

  function wingOfMatchId(id) {
    if (id === "F" || id === "TP") {
      return "center";
    }
    if (/-R\d/.test(id) || id.endsWith("-R01")) {
      return "right";
    }
    return "left";
  }

  const CONNECTOR_INSET = 4;

  const WING_GAP_COMPACT = { r32r16: 78, r16qf: 78, qfsf: 95 };
  const WING_GAP_LOW = { r32r16: 70, r16qf: 90, qfsf: 110 };
  const WING_GAP_HIGH = { r32r16: 110, r16qf: 130, qfsf: 150 };

  const COMPACT_CARD_MIN_SCALE = 1.24;
  const COMPACT_CARD_TARGET_SCALE = 1.28;
  const COMPACT_GAP_BORROW = 0.76;
  const MIN_MEASURED_COL_W = 52;

  function isWideBracketViewport() {
    return Boolean(root.matchMedia?.("(min-width: 2560px)").matches);
  }

  function layoutViewportWidth() {
    return root.innerWidth || 1920;
  }

  function resolveWideWingSpacing() {
    return { gaps: { ...WING_GAP_LOW }, spread: 0 };
  }

  function distributeWingGapsToWidth(wingWidth, targetGaps) {
    const WING_MIN_COL_W = 76;
    const colBudget = WING_MIN_COL_W * 4;
    const targetSum = targetGaps.r32r16 + targetGaps.r16qf + targetGaps.qfsf;
    const minGaps = { r32r16: 56, r16qf: 52, qfsf: 60 };

    if (wingWidth <= 0 || targetSum <= 0) {
      return { ...targetGaps };
    }

    const needed = colBudget + targetSum;
    if (wingWidth >= needed) {
      const extra = wingWidth - needed;
      return {
        r32r16: Math.round(targetGaps.r32r16 + extra * 0.4),
        r16qf: Math.round(targetGaps.r16qf + extra * 0.35),
        qfsf: Math.round(targetGaps.qfsf + extra * 0.25)
      };
    }

    const gapBudget = Math.max(0, wingWidth - colBudget);
    if (gapBudget <= 0) {
      return { ...targetGaps };
    }

    const scale = gapBudget / targetSum;
    return {
      r32r16: Math.max(minGaps.r32r16, Math.round(targetGaps.r32r16 * scale)),
      r16qf: Math.max(minGaps.r16qf, Math.round(targetGaps.r16qf * scale)),
      qfsf: Math.max(minGaps.qfsf, Math.round(targetGaps.qfsf * scale))
    };
  }

  function fitWingGapsToWidth(wingWidth, targetGaps) {
    return distributeWingGapsToWidth(wingWidth, targetGaps);
  }

  function resolveWingStageGaps(viewportW) {
    const width = viewportW || layoutViewportWidth();
    if (width <= 1920) {
      return { ...WING_GAP_COMPACT };
    }
    if (width >= 2560) {
      return { ...WING_GAP_LOW };
    }
    const t = (width - 1920) / (2560 - 1920);
    return {
      r32r16: WING_GAP_COMPACT.r32r16 + t * (WING_GAP_HIGH.r32r16 - WING_GAP_COMPACT.r32r16),
      r16qf: WING_GAP_COMPACT.r16qf + t * (WING_GAP_HIGH.r16qf - WING_GAP_COMPACT.r16qf),
      qfsf: WING_GAP_COMPACT.qfsf + t * (WING_GAP_HIGH.qfsf - WING_GAP_COMPACT.qfsf)
    };
  }

  function estimateWingWidth(stageEl, scrollEl) {
    const wing = stageEl?.querySelector(".ko-v2-wing-left, .ko-v2-wing");
    const measured = wing?.clientWidth || 0;
    if (measured > 0) {
      return measured;
    }

    const scrollW = scrollEl?.clientWidth || 0;
    if (!scrollW || !stageEl) {
      return 0;
    }

    const hubW = readCssPx(stageEl, "--ko-hub-w", 112);
    const colGap = readCssPx(stageEl, "--ko-bracket-col-gap", 8) * 2;
    return Math.max(0, (scrollW - hubW - colGap) / 2);
  }

  function applyWingStageGaps(stageEl, options) {
    if (!stageEl) {
      return;
    }

    const wingWidth = estimateWingWidth(stageEl, options?.scrollEl);
    let gaps = resolveWingStageGaps(layoutViewportWidth());
    if (wingWidth > 0) {
      gaps = distributeWingGapsToWidth(wingWidth, gaps);
    }

    stageEl.style.setProperty("--ko-wing-gap-r32-r16", `${Math.round(gaps.r32r16)}px`);
    stageEl.style.setProperty("--ko-wing-gap-r16-qf", `${Math.round(gaps.r16qf)}px`);
    stageEl.style.setProperty("--ko-wing-gap-qf-sf", `${Math.round(gaps.qfsf)}px`);
    stageEl.style.setProperty("--ko-wing-spread", "0px");
  }

  function resolveCompactCardWidth(colW, minGap) {
    if (colW <= 0) {
      return 0;
    }

    const scaledW = Math.round(colW * COMPACT_CARD_TARGET_SCALE);
    const minScaledW = Math.round(colW * COMPACT_CARD_MIN_SCALE);
    const gapBudget = Math.max(0, Math.round(minGap * COMPACT_GAP_BORROW));
    const gapW = colW + gapBudget;
    const boostedW = gapBudget > 0
      ? Math.min(gapW, scaledW + Math.round(gapBudget * 0.55))
      : scaledW;

    return Math.max(minScaledW, Math.min(boostedW, gapW));
  }

  function applyCompactCardWidth(stageEl) {
    if (!stageEl) {
      return;
    }

    const viewportW = layoutViewportWidth();
    if (viewportW > 1920) {
      stageEl.style.removeProperty("--ko-card-w");
      return;
    }

    const col = stageEl.querySelector(".ko-v2-wing-left .ko-v2-round-col[data-round='R32']")
      || stageEl.querySelector(".ko-v2-round-col[data-round='R32']");
    const colW = col?.clientWidth || col?.getBoundingClientRect().width || 0;

    if (colW < MIN_MEASURED_COL_W) {
      stageEl.style.removeProperty("--ko-card-w");
      return;
    }

    const minGap = Math.min(
      readCssPx(stageEl, "--ko-wing-gap-r32-r16", WING_GAP_COMPACT.r32r16),
      readCssPx(stageEl, "--ko-wing-gap-r16-qf", WING_GAP_COMPACT.r16qf),
      readCssPx(stageEl, "--ko-wing-gap-qf-sf", WING_GAP_COMPACT.qfsf)
    );
    const targetW = resolveCompactCardWidth(colW, minGap);
    if (targetW < MIN_MEASURED_COL_W) {
      stageEl.style.removeProperty("--ko-card-w");
      return;
    }

    stageEl.style.setProperty("--ko-card-w", `${targetW}px`);
  }

  function anchorPoints(from, to, fromId) {
    const inset = CONNECTOR_INSET;
    if (wingOfMatchId(fromId) === "right") {
      return {
        x1: from.left - inset,
        y1: midY(from),
        x2: to.right + inset,
        y2: midY(to)
      };
    }

    return {
      x1: from.right + inset,
      y1: midY(from),
      x2: to.left - inset,
      y2: midY(to)
    };
  }

  function getConnectorAnchors(fromEl, toEl, stageEl, fromId) {
    const from = offsetRect(fromEl, stageEl);
    const to = offsetRect(toEl, stageEl);
    const { x1, y1, x2, y2 } = anchorPoints(from, to, fromId);
    return { startX: x1, startY: y1, endX: x2, endY: y2 };
  }

  function curvePath(x1, y1, x2, y2, fromId, compact) {
    const fromWing = wingOfMatchId(fromId);
    const dx = Math.abs(x2 - x1);
    const curveMax = compact ? 33.6 : 42;
    const curveFactor = compact ? 0.336 : 0.42;
    const c = Math.max(10, Math.min(curveMax, dx * curveFactor));
    const c1x = fromWing === "right" ? x1 - c : x1 + c;
    const c2x = fromWing === "right" ? x2 + c : x2 - c;
    return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
  }

  function bracketGridEl(stageEl) {
    return stageEl?.querySelector(".knockout-bracket-grid, .ko-v2-bracket");
  }

  function isScrollableViewport() {
    return root.innerWidth < SCROLL_BREAK_W;
  }

  function mergeProfile(base, override) {
    return { ...base, ...override };
  }

  function getLayoutProfile(scrollEl, stageEl) {
    const width = root.innerWidth;
    const height = root.innerHeight;
    const compactWidth = width <= 1920;
    const compactHeight = height <= 1080;

    let profile = { ...DEFAULT_PROFILE };

    if (compactWidth) {
      profile = mergeProfile(profile, COMPACT_WIDTH_PROFILE);
    } else if (compactHeight) {
      profile = mergeProfile(profile, COMPACT_HEIGHT_PROFILE);
    }

    if (compactWidth && compactHeight) {
      profile = mergeProfile(profile, {
        wingTopInset: COMPACT_HEIGHT_PROFILE.wingTopInset,
        verticalCompress: COMPACT_HEIGHT_PROFILE.verticalCompress,
        distributeEvenly: true,
        compact: true
      });
    }

    profile.compact = compactWidth || compactHeight;

    if (isWideBracketViewport()) {
      profile = mergeProfile(profile, COMPACT_WIDTH_PROFILE);
      profile = mergeProfile(profile, {
        wingTopInset: COMPACT_HEIGHT_PROFILE.wingTopInset,
        verticalCompress: 1,
        distributeEvenly: true,
        compact: true
      });
    }

    if (stageEl) {
      applyStageMetrics(stageEl, profile, scrollEl);
      if (profile.compact) {
        const measuredH = readCssPx(stageEl, "--ko-match-h", profile.matchH);
        if (measuredH > 0) {
          profile.matchH = measuredH;
        }
      }
    }

    profile.stackH = computeStackHeight(scrollEl, stageEl, profile);
    profile.slotPitch = profile.matchH + profile.slotGapR32;

    return profile;
  }

  function readCssPx(el, prop, fallback) {
    if (!el || !root.getComputedStyle) {
      return fallback;
    }
    const raw = root.getComputedStyle(el).getPropertyValue(prop).trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readBracketPadTop(stageEl) {
    const bracket = bracketGridEl(stageEl);
    if (!bracket || !root.getComputedStyle) {
      return TITLE_PAD + 76;
    }
    return parseFloat(root.getComputedStyle(bracket).paddingTop) || TITLE_PAD + 76;
  }

  function readBracketPadBottom(stageEl) {
    const bracket = bracketGridEl(stageEl);
    if (!bracket || !root.getComputedStyle) {
      return 10;
    }
    return parseFloat(root.getComputedStyle(bracket).paddingBottom) || 10;
  }

  function minEvenStackHeight(profile) {
    return profile.wingTopInset * 2 + profile.matchH * 8;
  }

  function wingStackHeight(profile) {
    const { matchH, slotGapR32, wingTopInset } = profile;
    return wingTopInset * 2 + matchH * 8 + slotGapR32 * 7;
  }

  function computeStackHeight(scrollEl, stageEl, profile) {
    if (!profile.distributeEvenly) {
      return wingStackHeight(profile);
    }

    const scrollH = scrollEl?.clientHeight || 0;
    if (!scrollH) {
      return wingStackHeight(profile);
    }

    const padTop = readBracketPadTop(stageEl);
    const padBottom = readBracketPadBottom(stageEl);
    const avail = scrollH - padTop - VERTICAL_TOP_INSET - LABEL_H - padBottom;
    const minH = minEvenStackHeight(profile);

    if (avail <= 0) {
      return minH;
    }

    return Math.max(minH, avail);
  }

  function naturalStageHeight(stackH, profile) {
    const h = stackH || wingStackHeight(profile);
    const wingMin = LABEL_H + h;
    const hubMin = LABEL_H + profile.matchH + HUB_GAP + HUB_TROPHY + HUB_GAP + profile.matchH + LABEL_H;
    return Math.max(wingMin, hubMin) + TITLE_PAD + 12 + HUB_SHIFT_Y;
  }

  function buildParentsByChild(pairs) {
    const parents = {};
    (pairs || []).forEach(([fromId, toId]) => {
      if (!parents[toId]) {
        parents[toId] = [];
      }
      parents[toId].push(fromId);
    });
    return parents;
  }

  function r32CenterY(index, count, profile, stackH) {
    const { matchH, wingTopInset, slotGapR32, distributeEvenly } = profile;

    if (distributeEvenly && count > 1) {
      const track = stackH - wingTopInset * 2 - matchH;
      return wingTopInset + matchH / 2 + (index * track) / (count - 1);
    }

    return wingTopInset + matchH / 2 + index * (matchH + slotGapR32);
  }

  function computeCenterY(pairs, columnOrder, profile, stackH) {
    const parentsByChild = buildParentsByChild(pairs);
    const centerY = {};
    const resolvedStackH = stackH || profile.stackH || wingStackHeight(profile);

    // Place R32 cards first by matchNum order so the R32 column reads
    // top-to-bottom as M73 → M88, evenly distributed across the full
    // wing stack. Each R16 card then anchors at the midpoint of its two
    // R32 parents, so connectors fan *inward* from the wide R32 column
    // into the narrower R16 column (the classic FIFA bracket cone).
    ["left", "right"].forEach((wing) => {
      const r32Ids = columnOrder?.[wing]?.R32 || [];
      r32Ids.forEach((id, index) => {
        centerY[id] = r32CenterY(index, r32Ids.length, profile, resolvedStackH);
      });
    });

    const rounds = ["R16", "QF", "SF"];
    ["left", "right"].forEach((wing) => {
      rounds.forEach((round) => {
        (columnOrder?.[wing]?.[round] || []).forEach((id) => {
          const parents = parentsByChild[id] || [];
          if (parents.length === 2 && centerY[parents[0]] != null && centerY[parents[1]] != null) {
            centerY[id] = (centerY[parents[0]] + centerY[parents[1]]) / 2;
          }
        });
      });
    });

    const sfLeft = centerY["SF-L01"];
    const sfRight = centerY["SF-R01"];
    if (sfLeft != null && sfRight != null) {
      centerY.F = (sfLeft + sfRight) / 2;
    }

    return centerY;
  }

  function compressCenterY(centerY, stackMid, verticalCompress) {
    const out = { ...centerY };
    Object.keys(out).forEach((id) => {
      out[id] = stackMid + (out[id] - stackMid) * verticalCompress;
    });
    return out;
  }

  function normalizeStackCenterY(centerY, profile) {
    const wingIds = Object.keys(centerY).filter((id) => id !== "F" && id !== "TP");
    if (!wingIds.length) {
      return { centerY, stackH: wingStackHeight(profile) };
    }

    const values = wingIds.map((id) => centerY[id]);
    const minCenter = Math.min(...values);
    const maxCenter = Math.max(...values);
    const stackH = maxCenter - minCenter + profile.matchH + profile.wingTopInset * 2;
    const shift = profile.wingTopInset + profile.matchH / 2 - minCenter;
    const normalized = { ...centerY };

    Object.keys(normalized).forEach((id) => {
      if (normalized[id] != null) {
        normalized[id] += shift;
      }
    });

    return { centerY: normalized, stackH };
  }

  function resetCardPosition(card) {
    card.style.marginTop = "0";
    card.style.marginBottom = "0";
    card.style.transform = "";
    card.style.top = "";
    card.style.position = "";
  }

  function positionCard(card, centerY, matchH) {
    const isRight = Boolean(card.closest(".ko-v2-wing-right"));
    card.style.position = "absolute";
    card.style.top = `${centerY - matchH / 2}px`;
    card.style.marginTop = "0";
    card.style.transform = "";
    if (isRight) {
      card.style.left = "auto";
      card.style.right = "0";
    } else {
      card.style.left = "0";
      card.style.right = "auto";
    }
  }

  function applyScrollContainerMetrics(scrollEl, profile) {
    if (!scrollEl) {
      return;
    }

    if (profile.compact) {
      scrollEl.style.height = `calc(100vh - ${BRACKET_CHROME}px)`;
      scrollEl.style.maxHeight = `calc(100vh - ${BRACKET_CHROME}px)`;
      scrollEl.style.overflowX = "hidden";
      scrollEl.style.overflowY = "hidden";
      void scrollEl.offsetHeight;
      return;
    }

    scrollEl.style.height = "";
    scrollEl.style.maxHeight = "";
    scrollEl.style.overflowX = "";
    scrollEl.style.overflowY = "";
  }

  function applyStageMetrics(stageEl, profile, scrollEl) {
    if (!stageEl) {
      return;
    }

    applyWingStageGaps(stageEl, {
      scrollEl,
      hubW: readCssPx(stageEl, "--ko-hub-w", 130)
    });
    stageEl.style.setProperty("--ko-match-h", `${profile.matchH}px`);
    stageEl.style.setProperty("--ko-gap", `${profile.slotGapR32}px`);
    stageEl.style.setProperty("--ko-slot", `${profile.slotPitch}px`);
    stageEl.style.setProperty("--ko-label", `${LABEL_H}px`);
    stageEl.style.setProperty("--ko-gap-r32", `${profile.slotGapR32}px`);
    stageEl.style.setProperty("--ko-gap-r16", `${profile.slotGapR16}px`);
    stageEl.style.setProperty("--ko-gap-qf", `${profile.slotGapQF}px`);
    stageEl.style.setProperty("--ko-gap-sf", `${profile.slotGapSF}px`);
    stageEl.style.setProperty("--ko-wing-top-inset", `${profile.wingTopInset}px`);
    stageEl.dataset.koLayoutMode = profile.distributeEvenly ? "even" : "fixed";
  }

  function layoutTreeBracket(stageEl, pairs, columnOrder, scrollEl) {
    if (!stageEl) {
      return;
    }

    if (scrollEl) {
      void scrollEl.offsetHeight;
    }

    const profile = getLayoutProfile(scrollEl, stageEl);
    applyStageMetrics(stageEl, profile, scrollEl);

    let stackH = profile.stackH;
    let centerY = computeCenterY(pairs, columnOrder, profile, stackH);

    if (!profile.distributeEvenly) {
      const rawStackH = wingStackHeight(profile);
      centerY = compressCenterY(centerY, rawStackH / 2, profile.verticalCompress);
      const normalized = normalizeStackCenterY(centerY, profile);
      centerY = normalized.centerY;
      stackH = normalized.stackH;
    }

    const stackMarginTop = VERTICAL_TOP_INSET;

    stageEl.style.setProperty("--ko-wing-h", `${stackH}px`);
    stageEl.style.setProperty("--ko-stack-margin", `${stackMarginTop}px`);

    const bracket = bracketGridEl(stageEl);
    if (bracket) {
      bracket.style.marginTop = `${stackMarginTop}px`;
    }

    stageEl.querySelectorAll(".ko-v2-round-stack").forEach((stack) => {
      stack.style.height = `${stackH}px`;
      stack.style.marginTop = "0";
      stack.style.marginBottom = "0";
      stack.style.display = "block";
      stack.style.flexDirection = "";
      stack.style.justifyContent = "";
    });

    stageEl.querySelectorAll("[data-match-id]").forEach((card) => {
      resetCardPosition(card);
    });

    Object.keys(centerY).forEach((id) => {
      const card = stageEl.querySelector(`[data-match-id="${id}"]`);
      if (!card || id === "F" || id === "TP") {
        return;
      }
      positionCard(card, centerY[id], profile.matchH);
    });

    applyCompactCardWidth(stageEl);
  }

  function applyBracketMetrics(scrollEl, stageEl) {
    if (!scrollEl || !stageEl) {
      return;
    }

    const tentativeCompact = root.innerWidth <= 1920 || root.innerHeight <= 1080 || isWideBracketViewport();
    if (tentativeCompact) {
      applyScrollContainerMetrics(scrollEl, { compact: true });
    }

    const profile = getLayoutProfile(scrollEl, stageEl);
    applyScrollContainerMetrics(scrollEl, profile);
    void scrollEl.offsetHeight;

    const scrollable = isScrollableViewport();
    const pad = 4;
    const availW = Math.max(scrollEl.clientWidth - pad, 320);
    const stackH = profile.stackH || wingStackHeight(profile);
    const hubW = Math.max(150, Math.min(260, availW * 0.135));
    const stageMin = naturalStageHeight(stackH, profile);

    stageEl.style.setProperty("--ko-hub-w", `${hubW}px`);
    applyStageMetrics(stageEl, profile, scrollEl);

    scrollEl.classList.toggle("is-scrollable", scrollable);
    stageEl.classList.toggle("is-natural-height", scrollable && !profile.compact);
    stageEl.classList.toggle("is-compact-height", profile.compact);

    stageEl.style.transform = "none";
    stageEl.style.width = "100%";

    if (scrollable && !profile.compact) {
      stageEl.style.height = "auto";
      stageEl.style.minHeight = `${stageMin}px`;
    } else {
      stageEl.style.height = "100%";
      stageEl.style.minHeight = "0";
    }

    stageEl.style.setProperty("--ko-hub-w", `${hubW}px`);
    stageEl.style.setProperty("--ko-font", `${FONT_MAIN}px`);
    stageEl.style.setProperty("--ko-font-sm", `${FONT_SM}px`);
    stageEl.style.setProperty("--ko-stage-min-h", `${stageMin}px`);
    stageEl.style.setProperty("--ko-wing-h", `${stackH}px`);
    stageEl.style.setProperty("--ko-hub-shift", `${HUB_SHIFT_Y}px`);
  }

  // Returns the trophy / hub bounding box (in stage coordinates) so we can
  // refuse connectors that would cut through the center area. The hub is the
  // column between the two wings that holds the Final + 3rd-place + trophy.
  function getHubRect(stageEl) {
    const hub = stageEl?.querySelector?.(".ko-v2-hub, #ko-wing-center");
    if (!hub) {
      return null;
    }
    return offsetRect(hub, stageEl);
  }

  // Convert a connector's two endpoints (already on opposite wings) to a
  // path that strictly stays inside its own half. If the straight line crosses
  // the trophy hub, route the connector around it so we never draw a line
  // through the cup.
  function routeAroundHub(x1, y1, x2, y2, hubRect) {
    if (!hubRect) {
      return { x1, y1, x2, y2 };
    }
    const crossesHub = (a, b) => {
      const minX = Math.min(a, b);
      const maxX = Math.max(a, b);
      if (maxX <= hubRect.left || minX >= hubRect.right) {
        return false;
      }
      return true;
    };
    if (!crossesHub(x1, x2)) {
      return { x1, y1, x2, y2 };
    }
    // Route the connector via the outer edge of the hub so the SVG path
    // stays on the same side as the source match and never enters the
    // trophy column.
    const goLeft = x1 < hubRect.left;
    const safeX = goLeft ? hubRect.left - 8 : hubRect.right + 8;
    return {
      x1,
      y1,
      x2: goLeft ? x2 : x2,
      y2,
      detourX: safeX,
      midY: (y1 + y2) / 2
    };
  }

  function drawConnectors(options) {
    const {
      svgEl,
      stageEl,
      pairs,
      bracketState,
      compact
    } = options;

    if (!svgEl || !stageEl) {
      return;
    }

    const isCompact = compact ?? (root.innerWidth <= 1920 || root.innerHeight <= 1080);
    const byId = bracketState?.byId || {};
    const stageW = Math.max(stageEl.scrollWidth, stageEl.offsetWidth, 1);
    const stageH = Math.max(stageEl.scrollHeight, stageEl.offsetHeight, 1);
    const hubRect = getHubRect(stageEl);
    const SVG_NS = "http://www.w3.org/2000/svg";
    const pathNodes = [];

    // 1. Wipe the connector layer FIRST so old paths never linger between
    // rerenders or after resize/layout changes.
    while (svgEl.firstChild) {
      svgEl.removeChild(svgEl.firstChild);
    }

    (pairs || []).forEach(([fromId, toId]) => {
      const fromEl = stageEl.querySelector(`[data-match-id="${fromId}"]`);
      const toEl = stageEl.querySelector(`[data-match-id="${toId}"]`);
      if (!fromEl || !toEl) {
        // Skip silently: a missing card means the bracket hasn't rendered
        // that match yet. Recompute every rerender keeps it tight.
        return;
      }

      const { startX, startY, endX, endY } = getConnectorAnchors(fromEl, toEl, stageEl, fromId);
      const routed = routeAroundHub(startX, startY, endX, endY, hubRect);
      const d = routed.detourX != null
        ? `M ${routed.x1} ${routed.y1} L ${routed.detourX} ${routed.y1} L ${routed.detourX} ${routed.midY} L ${routed.detourX} ${routed.y2} L ${routed.x2} ${routed.y2}`
        : curvePath(startX, startY, endX, endY, fromId, isCompact);

      const match = byId[fromId];
      const active = match && (match.apiMatch?.status === "LIVE" || match.winnerName);
      const pathEl = root.document?.createElementNS?.(SVG_NS, "path");
      if (!pathEl) {
        // Fallback to a single innerHTML clear+set if createElementNS is
        // unavailable (e.g. SSR test sandbox). Same wiper semantics.
        return;
      }
      pathEl.setAttribute("class", active ? "is-active" : "");
      pathEl.setAttribute("d", d);
      pathNodes.push(pathEl);
    });

    // 2. Set the viewBox BEFORE swapping children so the cleared layer is
    // sized for the next pass (avoids a 0x0 frame flash).
    svgEl.setAttribute("viewBox", `0 0 ${stageW} ${stageH}`);
    svgEl.setAttribute("width", String(stageW));
    svgEl.setAttribute("height", String(stageH));

    // 3. Atomically replace children — no append, no leak.
    if (root.Node && svgEl.replaceChildren) {
      svgEl.replaceChildren(...pathNodes);
    } else {
      while (svgEl.firstChild) {
        svgEl.removeChild(svgEl.firstChild);
      }
      pathNodes.forEach((n) => svgEl.appendChild(n));
    }
  }

  function scheduleConnectorDraw(options) {
    root.requestAnimationFrame(() => {
      root.requestAnimationFrame(() => {
        const stageEl = options.stageEl;
        const scrollEl = options.scrollEl;
        if (!stageEl || !scrollEl) {
          return;
        }

        const columnOrder = options.columnOrder || {};
        const profile = getLayoutProfile(scrollEl, stageEl);
        applyBracketMetrics(scrollEl, stageEl);
        layoutTreeBracket(stageEl, options.pairs, columnOrder, scrollEl);
        drawConnectors({ ...options, compact: profile.compact });
      });
    });
  }

  root.WC26KnockoutLayout = {
    MATCH_H: DEFAULT_PROFILE.matchH,
    FONT_MAIN,
    BRACKET_CHROME,
    isScrollableViewport,
    buildParentsByChild,
    computeCenterY,
    getLayoutProfile,
    getConnectorAnchors,
    resolveWingStageGaps,
    resolveWideWingSpacing,
    applyWingStageGaps,
    distributeWingGapsToWidth,
    applyCompactCardWidth,
    resolveCompactCardWidth,
    fitWingGapsToWidth,
    isWideBracketViewport,
    minEvenStackHeight,
    wingStackHeight,
    computeStackHeight,
    applyBracketMetrics,
    layoutTreeBracket,
    drawConnectors,
    scheduleConnectorDraw
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
