(() => {
  const DEFAULT_TEMPLATE = `
<div class="reel-selector" id="reelSelector">
  <div class="reel-columns">
    <div class="reel-stack">
      <div class="reel-head">
        <span class="reel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 6h6v12H4V6zm10 0h6v12h-6V6zM11 8h2v8h-2V8z"/></svg>
        </span>
        <span class="reel-label">Rank</span>
      </div>
      <div class="reel" id="reelRanks" aria-label="Rank selector"></div>
    </div>
    <div class="reel-stack">
      <div class="reel-head">
        <span class="reel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 2l4 8h-8l4-8zm-6 10h12l-6 10-6-10z"/></svg>
        </span>
        <span class="reel-label">Council</span>
      </div>
      <div class="reel" id="reelCouncils" aria-label="Council selector"></div>
    </div>
    <div class="reel-stack">
      <div class="reel-head">
        <span class="reel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 2l3 4-3 4-3-4 3-4zm7 7l3 4-3 4-3-4 3-4zM5 9l3 4-3 4-3-4 3-4zm7 7l3 4-3 4-3-4 3-4z"/></svg>
        </span>
        <span class="reel-label">Suit</span>
      </div>
      <div class="reel" id="reelSuits" aria-label="Suit selector"></div>
    </div>
  </div>
  <div class="wheel-card-wrap">
    <div class="wheel-physical" id="wheelPhysical">
      <div class="wheel-card-face">
        <div class="wheel-card-header">
          <div class="wheel-card-rank" id="wheelCardRank">2</div>
          <div class="wheel-card-suit" id="wheelCardSuit">&#x2665;</div>
        </div>
        <div class="wheel-card-title" id="wheelCardTitle">2 OF HEARTS - NORTH</div>
        <div class="wheel-card-stats">
          <div class="wheel-card-stat" id="wheelStatLevel">Level: 1</div>
          <div class="wheel-card-stat" id="wheelStatCopies">Copies: 0</div>
          <div class="wheel-card-stat" id="wheelStatPower">Power: 1</div>
          <div class="wheel-card-stat" id="wheelStatSuit">Suit: Hearts</div>
        </div>
      </div>
    </div>
  </div>
  <div class="wheel-actions">
    <button class="btn primary" id="wheelAddToBattle">Add to Battle Deck</button>
    <button class="btn ghost" id="wheelUpgradeCard">Upgrade</button>
  </div>
</div>
`.trim();

  function create(config = {}) {
    const {
      hostId = "wheelModuleHost",
      templateUrl = "./wheel-selector.html",
      wheelRanksOrder = [],
      councils = [],
      councilNames = {},
      suitToSymbol = {},
      suitCycle = [],
      getActiveSuit,
      getCardsBySuit,
      getCollection,
      onAddToBattle,
      onUpgrade,
      onCycleSuit,
      onSelectSuit,
      onSelectionChange
    } = config;

    let reelSelector = null;
    let reelRanks = null;
    let reelCouncils = null;
    let reelSuits = null;
    let wheelCardTitle = null;
    let wheelStatLevel = null;
    let wheelStatCopies = null;
    let wheelStatPower = null;
    let wheelStatSuit = null;
    let wheelAddToBattle = null;
    let wheelUpgradeCard = null;
    let wheelPhysical = null;
    let wheelCardRank = null;
    let wheelCardSuit = null;
    let isActive = true;
    let mountPromise = null;

    let selectedRankIndex = 0;
    let selectedCouncilIndex = 0;
    let selectedSuitIndex = 0;
    let ready = false;
    let didInitialScroll = false;

    const reelState = {
      ranks: { lock: false, timer: null },
      councils: { lock: false, timer: null },
      suits: { lock: false, timer: null }
    };

    function bindElements() {
      reelSelector = document.getElementById("reelSelector");
      reelRanks = document.getElementById("reelRanks");
      reelCouncils = document.getElementById("reelCouncils");
      reelSuits = document.getElementById("reelSuits");
      wheelCardTitle = document.getElementById("wheelCardTitle");
      wheelStatLevel = document.getElementById("wheelStatLevel");
      wheelStatCopies = document.getElementById("wheelStatCopies");
      wheelStatPower = document.getElementById("wheelStatPower");
      wheelStatSuit = document.getElementById("wheelStatSuit");
      wheelAddToBattle = document.getElementById("wheelAddToBattle");
      wheelUpgradeCard = document.getElementById("wheelUpgradeCard");
      wheelPhysical = document.getElementById("wheelPhysical");
      wheelCardRank = document.getElementById("wheelCardRank");
      wheelCardSuit = document.getElementById("wheelCardSuit");
    }

    async function mount() {
      if (mountPromise) return mountPromise;
      mountPromise = (async () => {
        const host = document.getElementById(hostId);
        if (!host) {
          isActive = false;
          return false;
        }
        if (!document.getElementById("reelSelector")) {
          try {
            const response = await fetch(templateUrl, { cache: "no-cache" });
            if (!response.ok) throw new Error("Template fetch failed");
            host.innerHTML = await response.text();
          } catch {
            host.innerHTML = DEFAULT_TEMPLATE;
          }
        }
        bindElements();
        return !!reelSelector;
      })();
      return mountPromise;
    }

    function getReelItemHeight(reel) {
      if (!reel) return 44;
      const raw = getComputedStyle(reel).getPropertyValue("--reel-item");
      const value = Number.parseFloat(raw);
      return Number.isFinite(value) ? value : 44;
    }

    function getBaseCount(reel) {
      return Number.parseInt(reel?.dataset.baseCount || "0", 10) || 0;
    }

    function getRepeatCount(reel) {
      return Number.parseInt(reel?.dataset.repeatCount || "1", 10) || 1;
    }

    function getMiddleOffsetIndex(reel, index) {
      const baseCount = getBaseCount(reel);
      if (!baseCount) return index;
      return index + baseCount;
    }

    function scrollReelTo(reel, index, stateKey, behavior = "smooth") {
      if (!reel) return;
      const itemHeight = getReelItemHeight(reel);
      const targetIndex = getMiddleOffsetIndex(reel, index);
      reelState[stateKey].lock = true;
      reel.scrollTo({ top: targetIndex * itemHeight, behavior });
      window.setTimeout(() => {
        reelState[stateKey].lock = false;
        applyBarrelEffect(reel);
      }, 120);
    }

    function buildReel(reel, items, stateKey, renderItem) {
      if (!reel) return;
      reel.innerHTML = "";
      const repeat = 3;
      reel.dataset.baseCount = items.length.toString();
      reel.dataset.repeatCount = repeat.toString();
      for (let r = 0; r < repeat; r += 1) {
        items.forEach((item, index) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "reel-item";
          btn.dataset.index = index.toString();
          btn.innerHTML = renderItem(item);
          btn.addEventListener("click", () => {
            if (stateKey === "ranks") setRankIndex(index);
            if (stateKey === "councils") setCouncilIndex(index);
            if (stateKey === "suits") setSuitIndex(index);
          });
          reel.appendChild(btn);
        });
      }
    }

    function updateActiveItem(reel, index) {
      if (!reel) return;
      Array.from(reel.querySelectorAll(".reel-item")).forEach((item) => {
        item.classList.toggle("active", Number(item.dataset.index) === index);
      });
    }

    function wrapReelScroll(reel) {
      if (!reel) return;
      const baseCount = getBaseCount(reel);
      const repeat = getRepeatCount(reel);
      if (!baseCount || repeat < 2) return;
      const itemHeight = getReelItemHeight(reel);
      const baseHeight = baseCount * itemHeight;
      const min = baseHeight * 0.5;
      const max = baseHeight * 1.5;
      if (reel.scrollTop < min) {
        reel.scrollTop += baseHeight;
        return true;
      }
      if (reel.scrollTop > max) {
        reel.scrollTop -= baseHeight;
        return true;
      }
      return false;
    }

    function handleScroll(reel, stateKey, getIndex, setIndex) {
      if (!reel) return;
      reel.addEventListener("scroll", () => {
        applyBarrelEffect(reel);
        if (wrapReelScroll(reel)) return;
        if (reelState[stateKey].lock) return;
        if (reelState[stateKey].timer) clearTimeout(reelState[stateKey].timer);
        reelState[stateKey].timer = window.setTimeout(() => {
          const itemHeight = getReelItemHeight(reel);
          const baseCount = getBaseCount(reel);
          const rawIndex = Math.round(reel.scrollTop / itemHeight);
          const nextIndex = baseCount ? (rawIndex % baseCount + baseCount) % baseCount : rawIndex;
          reelState[stateKey].lock = true;
          setIndex(nextIndex, { behavior: "auto" });
          reelState[stateKey].lock = false;
        }, 220);
      });
    }

    function applyBarrelEffect(reel) {
      if (!reel) return;
      const items = Array.from(reel.querySelectorAll(".reel-item"));
      if (!items.length) return;
      const reelRect = reel.getBoundingClientRect();
      const reelCenter = reelRect.top + reelRect.height / 2;
      const itemHeight = getReelItemHeight(reel);
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const offset = itemCenter - reelCenter;
        const normalized = offset / itemHeight;
        const tilt = Math.max(-35, Math.min(35, normalized * 18));
        const depth = Math.max(0.82, 1 - Math.min(0.18, Math.abs(normalized) * 0.08));
        const fade = Math.max(0.18, 1 - Math.min(0.8, Math.abs(normalized) * 0.35));
        item.style.transform = `translateY(${(-normalized * 4).toFixed(2)}px) rotateX(${tilt.toFixed(2)}deg) scale(${depth.toFixed(2)})`;
        item.style.opacity = fade.toFixed(2);
      });
    }

    function renderWheelCard() {
      if (!reelSelector) return;
      const activeSuit = getActiveSuit?.();
      const cardsBySuit = getCardsBySuit?.();
      const collection = getCollection?.();
      if (!activeSuit || !cardsBySuit) return;

      const rank = wheelRanksOrder[selectedRankIndex];
      const card = cardsBySuit[activeSuit]?.find(c => c.rank === rank);
      if (!card) return;

      const council = councils[selectedCouncilIndex] || "N";
      const cardId = `${activeSuit}-${council}-${rank}`;
      const meta = (collection && collection[cardId]) || { count: 0, level: 1 };
      const power = card.power + (meta.level - 1) * 2;
      const councilLabel = councilNames[council] || council;
      const owned = meta.count > 0;

      if (wheelCardTitle) {
        wheelCardTitle.textContent = owned
          ? `${card.rank} of ${card.suit} - ${councilLabel}`.toUpperCase()
          : "CARD TO COLLECT";
      }
      if (wheelCardRank) wheelCardRank.textContent = card.rank;
      if (wheelCardSuit) wheelCardSuit.textContent = suitToSymbol[activeSuit] || "";
      if (wheelStatLevel) wheelStatLevel.textContent = owned ? `Level: ${meta.level}` : "Level: --";
      if (wheelStatCopies) wheelStatCopies.textContent = owned ? `Copies: ${meta.count}` : "Copies: 0";
      if (wheelStatPower) wheelStatPower.textContent = owned ? `Power: ${power}` : "Power: --";
      if (wheelStatSuit) wheelStatSuit.textContent = `Suit: ${card.suit}`;
      if (wheelAddToBattle) wheelAddToBattle.disabled = !owned;
      if (wheelUpgradeCard) wheelUpgradeCard.disabled = !owned;

      onSelectionChange?.({ cardId, councilIndex: selectedCouncilIndex });
    }

    function hasCard(rank) {
      const activeSuit = getActiveSuit?.();
      const collection = getCollection?.();
      if (!activeSuit || !collection) return false;
      const council = councils[selectedCouncilIndex] || "N";
      return (collection[`${activeSuit}-${council}-${rank}`]?.count || 0) > 0;
    }

    function updateRankAvailability() {
      if (!reelRanks) return;
      Array.from(reelRanks.querySelectorAll(".reel-item")).forEach((btn) => {
        btn.classList.remove("locked");
        btn.disabled = false;
      });
    }

    function setRankIndex(index, options = {}) {
      const total = wheelRanksOrder.length;
      const nextIndex = (index + total) % total;
      selectedRankIndex = nextIndex;
      updateActiveItem(reelRanks, nextIndex);
      scrollReelTo(reelRanks, nextIndex, "ranks", options.behavior);
      if (!options.silent) renderWheelCard();
    }

    function setCouncilIndex(index, options = {}) {
      selectedCouncilIndex = (index + councils.length) % councils.length;
      updateActiveItem(reelCouncils, selectedCouncilIndex);
      scrollReelTo(reelCouncils, selectedCouncilIndex, "councils", options.behavior);
      updateRankAvailability();
      if (!options.silent) renderWheelCard();
    }

    function setSuitIndex(index, options = {}) {
      selectedSuitIndex = (index + suitCycle.length) % suitCycle.length;
      updateActiveItem(reelSuits, selectedSuitIndex);
      scrollReelTo(reelSuits, selectedSuitIndex, "suits", options.behavior);
      if (!options.noCallback) {
        const suitName = suitCycle[selectedSuitIndex]?.name;
        if (suitName) {
          if (onSelectSuit) {
            onSelectSuit(suitName);
          } else {
            onCycleSuit?.();
          }
        }
      }
    }

    async function init() {
      if (ready) return;
      const ok = await mount();
      if (!ok) return;

      buildReel(
        reelRanks,
        wheelRanksOrder,
        "ranks",
        (rank) => rank
      );
      buildReel(
        reelCouncils,
        councils,
        "councils",
        (council) => council
      );
      buildReel(
        reelSuits,
        suitCycle,
        "suits",
        (suit) => `<span class="reel-suit">${suit.icon}</span><span class="reel-suit-label">${suit.name}</span>`
      );

      handleScroll(reelRanks, "ranks", () => selectedRankIndex, setRankIndex);
      handleScroll(reelCouncils, "councils", () => selectedCouncilIndex, setCouncilIndex);
      handleScroll(reelSuits, "suits", () => selectedSuitIndex, setSuitIndex);

      [reelRanks, reelCouncils, reelSuits].forEach(reel => {
        const baseCount = getBaseCount(reel);
        if (!baseCount) return;
        const itemHeight = getReelItemHeight(reel);
        const key = reel === reelRanks ? "ranks" : (reel === reelCouncils ? "councils" : "suits");
        reelState[key].lock = true;
        reel.scrollTop = baseCount * itemHeight;
        reelState[key].lock = false;
      });
      scrollReelTo(reelRanks, selectedRankIndex, "ranks", "auto");
      scrollReelTo(reelCouncils, selectedCouncilIndex, "councils", "auto");
      scrollReelTo(reelSuits, selectedSuitIndex, "suits", "auto");
      didInitialScroll = true;

      wheelAddToBattle?.addEventListener("click", () => {
        const activeSuit = getActiveSuit?.();
        const rank = wheelRanksOrder[selectedRankIndex];
        const council = councils[selectedCouncilIndex] || "N";
        if (!activeSuit || !rank) return;
        onAddToBattle?.(`${activeSuit}-${council}-${rank}`);
      });
      wheelUpgradeCard?.addEventListener("click", () => {
        const activeSuit = getActiveSuit?.();
        const rank = wheelRanksOrder[selectedRankIndex];
        const council = councils[selectedCouncilIndex] || "N";
        if (!activeSuit || !rank) return;
        onUpgrade?.(`${activeSuit}-${council}-${rank}`);
      });
      if (wheelPhysical) {
        wheelPhysical.addEventListener("mousemove", event => {
          const rect = wheelPhysical.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) - 0.5;
          const y = ((event.clientY - rect.top) / rect.height) - 0.5;
          wheelPhysical.style.transform = `translateY(2px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
        });
        wheelPhysical.addEventListener("mouseleave", () => {
          wheelPhysical.style.transform = "translateY(6px) rotateX(6deg)";
        });
      }

      ready = true;
    }

    async function render() {
      await init();
      if (!ready) return;

      const activeSuit = getActiveSuit?.();
      if (activeSuit) {
        const suitIndex = suitCycle.findIndex(item => item.name === activeSuit);
        if (suitIndex >= 0 && suitIndex !== selectedSuitIndex) {
          selectedSuitIndex = suitIndex;
          updateActiveItem(reelSuits, selectedSuitIndex);
          scrollReelTo(reelSuits, selectedSuitIndex, "suits", "auto");
        }
      }

      updateActiveItem(reelRanks, selectedRankIndex);
      updateActiveItem(reelCouncils, selectedCouncilIndex);
      updateActiveItem(reelSuits, selectedSuitIndex);
      updateRankAvailability();
      if (!didInitialScroll) {
        scrollReelTo(reelRanks, selectedRankIndex, "ranks", "auto");
        scrollReelTo(reelCouncils, selectedCouncilIndex, "councils", "auto");
        scrollReelTo(reelSuits, selectedSuitIndex, "suits", "auto");
        didInitialScroll = true;
      }
      renderWheelCard();
      applyBarrelEffect(reelRanks);
      applyBarrelEffect(reelCouncils);
      applyBarrelEffect(reelSuits);
    }

    async function setActiveSuit() {
      await render();
    }

    return {
      get isActive() { return isActive; },
      render,
      setActiveSuit,
      setRankIndex,
      setCouncilIndex
    };
  }

  window.WheelSelector = { create };
})();
