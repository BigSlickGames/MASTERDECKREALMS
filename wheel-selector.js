(() => {
  const DEFAULT_TEMPLATE = `
<div class="wheel-layout" id="wheelLayout">
  <div class="wheel-dial" id="wheelDial">
    <div class="wheel-outer" id="wheelRanks"></div>
    <div class="wheel-inner-ring" id="wheelCouncilRing"></div>
    <div class="wheel-inner">
      <div class="wheel-core">
        <button class="suit-dial wheel-suit-btn" id="wheelSuitButton" aria-label="Suit selection button">
          <span class="dial-shell"></span>
          <span class="dial-ring"></span>
          <span class="dial-glass"></span>
          <span class="dial-sheen"></span>
          <span class="dial-sparks"></span>
          <span class="dial-icon" id="wheelSuitIcon">&#x2663;</span>
        </button>
      </div>
    </div>
    <div class="wheel-pointer"></div>
    <button class="wheel-step left btn ghost tiny" id="wheelPrev" aria-label="Previous card"><span class="wheel-step-label">Prev</span></button>
    <button class="wheel-step right btn ghost tiny" id="wheelNext" aria-label="Next card"><span class="wheel-step-label">Next</span></button>
  </div>
  <div class="wheel-card-wrap">
    <div class="wheel-physical" id="wheelPhysical">
      <div class="wheel-card-face">
        <div class="wheel-card-header">
          <div class="wheel-card-rank" id="wheelCardRank">2</div>
          <div class="wheel-card-suit" id="wheelCardSuit">♥</div>
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
      onSelectionChange
    } = config;

    let wheelLayout = null;
    let wheelDial = null;
    let wheelRanks = null;
    let wheelCouncilRing = null;
    let wheelPrev = null;
    let wheelNext = null;
    let wheelHolo = null;
    let wheelCardTitle = null;
    let wheelCardSub = null;
    let wheelStatLevel = null;
    let wheelStatCopies = null;
    let wheelStatPower = null;
    let wheelStatSuit = null;
    let wheelAddToBattle = null;
    let wheelUpgradeCard = null;
    let wheelPhysical = null;
    let wheelCardRank = null;
    let wheelCardSuit = null;
    let wheelSuitButton = null;
    let wheelSuitIcon = null;
    let isActive = true;
    let mountPromise = null;

    let selectedRankIndex = 0;
    let selectedCouncilIndex = 0;
    let ready = false;

    function bindElements() {
      wheelLayout = document.getElementById("wheelLayout");
      wheelDial = document.getElementById("wheelDial");
      wheelRanks = document.getElementById("wheelRanks");
      wheelCouncilRing = document.getElementById("wheelCouncilRing");
      wheelPrev = document.getElementById("wheelPrev");
      wheelNext = document.getElementById("wheelNext");
      wheelHolo = document.getElementById("wheelHolo");
      wheelCardTitle = document.getElementById("wheelCardTitle");
      wheelCardSub = document.getElementById("wheelCardSub");
      wheelStatLevel = document.getElementById("wheelStatLevel");
      wheelStatCopies = document.getElementById("wheelStatCopies");
      wheelStatPower = document.getElementById("wheelStatPower");
      wheelStatSuit = document.getElementById("wheelStatSuit");
      wheelAddToBattle = document.getElementById("wheelAddToBattle");
      wheelUpgradeCard = document.getElementById("wheelUpgradeCard");
      wheelPhysical = document.getElementById("wheelPhysical");
      wheelCardRank = document.getElementById("wheelCardRank");
      wheelCardSuit = document.getElementById("wheelCardSuit");
      wheelSuitButton = document.getElementById("wheelSuitButton");
      wheelSuitIcon = document.getElementById("wheelSuitIcon");
    }

    async function mount() {
      if (mountPromise) return mountPromise;
      mountPromise = (async () => {
        const host = document.getElementById(hostId);
        if (!host) {
          isActive = false;
          return false;
        }
        if (!document.getElementById("wheelLayout")) {
          try {
            const response = await fetch(templateUrl, { cache: "no-cache" });
            if (!response.ok) throw new Error("Template fetch failed");
            host.innerHTML = await response.text();
          } catch {
            host.innerHTML = DEFAULT_TEMPLATE;
          }
        }
        bindElements();
        return !!wheelLayout;
      })();
      return mountPromise;
    }

    function buildWheelRanks() {
      if (!wheelRanks) return;
      wheelRanks.innerHTML = "";
      wheelRanks.style.setProperty("--count", wheelRanksOrder.length);
      wheelRanksOrder.forEach((rank, i) => {
        const btn = document.createElement("button");
        btn.className = "wheel-rank";
        btn.style.setProperty("--i", i);
        btn.textContent = rank;
        btn.addEventListener("click", () => setRankIndex(i));
        wheelRanks.appendChild(btn);
      });
    }

    function buildCouncilRing() {
      if (!wheelCouncilRing) return;
      wheelCouncilRing.innerHTML = "";
      wheelCouncilRing.style.setProperty("--count", councils.length);
      councils.forEach((council, i) => {
        const btn = document.createElement("button");
        btn.className = "wheel-council";
        btn.style.setProperty("--i", i);
        btn.textContent = council;
        btn.addEventListener("click", () => setCouncilIndex(i));
        wheelCouncilRing.appendChild(btn);
      });
    }

    function updateWheelDial() {
      if (!wheelDial) return;
      const spin = -(selectedRankIndex * (360 / wheelRanksOrder.length));
      wheelDial.style.setProperty("--spin", `${spin}deg`);
      if (wheelRanks) {
        Array.from(wheelRanks.querySelectorAll(".wheel-rank")).forEach((btn, i) => {
          btn.classList.toggle("active", i === selectedRankIndex);
        });
      }
      if (wheelHolo) {
        wheelHolo.classList.remove("flick");
        void wheelHolo.offsetWidth;
        wheelHolo.classList.add("flick");
      }
      if (wheelPhysical) {
        wheelPhysical.classList.remove("rise");
        void wheelPhysical.offsetWidth;
        wheelPhysical.classList.add("rise");
      }
    }

    function updateCouncilDial() {
      if (!wheelCouncilRing) return;
      const spin = -(selectedCouncilIndex * (360 / councils.length));
      wheelCouncilRing.style.setProperty("--spin-inner", `${spin}deg`);
      Array.from(wheelCouncilRing.querySelectorAll(".wheel-council")).forEach((btn, i) => {
        btn.classList.toggle("active", i === selectedCouncilIndex);
      });
      if (wheelSuitButton && wheelSuitIcon && suitCycle.length) {
        const activeSuit = getActiveSuit?.();
        const data = suitCycle.find(item => item.name === activeSuit);
        if (data) {
          wheelSuitButton.style.setProperty("--c", data.color);
          wheelSuitIcon.textContent = data.icon;
        }
      }
    }

    function renderWheelCard() {
      if (!wheelLayout) return;
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

      if (wheelCardTitle) {
        wheelCardTitle.textContent = `${card.rank} of ${card.suit} - ${councilLabel}`.toUpperCase();
      }
      if (wheelCardSub) wheelCardSub.textContent = `Base power ${card.power}`;
      if (wheelCardRank) wheelCardRank.textContent = card.rank;
      if (wheelCardSuit) wheelCardSuit.textContent = suitToSymbol[activeSuit] || "";
      if (wheelStatLevel) wheelStatLevel.textContent = `Level: ${meta.level}`;
      if (wheelStatCopies) wheelStatCopies.textContent = `Copies: ${meta.count}`;
      if (wheelStatPower) wheelStatPower.textContent = `Power: ${power}`;
      if (wheelStatSuit) wheelStatSuit.textContent = `Suit: ${card.suit}`;

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
      if (!wheelRanks) return;
      Array.from(wheelRanks.querySelectorAll(".wheel-rank")).forEach((btn, i) => {
        const rank = wheelRanksOrder[i];
        const owned = hasCard(rank);
        btn.classList.toggle("locked", !owned);
        btn.disabled = !owned;
      });
    }

    function setRankIndex(index, options = {}) {
      const total = wheelRanksOrder.length;
      let nextIndex = (index + total) % total;
      if (!options.allowUnowned) {
        let guard = 0;
        while (guard < total && !hasCard(wheelRanksOrder[nextIndex])) {
          nextIndex = (nextIndex + 1) % total;
          guard += 1;
        }
        if (guard >= total) return;
      }
      selectedRankIndex = nextIndex;
      updateWheelDial();
      if (!options.silent) renderWheelCard();
    }

    function setCouncilIndex(index, options = {}) {
      selectedCouncilIndex = (index + councils.length) % councils.length;
      updateCouncilDial();
      updateRankAvailability();
      if (!options.silent) renderWheelCard();
    }

    async function init() {
      if (ready) return;
      const ok = await mount();
      if (!ok) return;
      buildWheelRanks();
      buildCouncilRing();
      updateCouncilDial();
      wheelPrev?.addEventListener("click", () => setRankIndex(selectedRankIndex - 1));
      wheelNext?.addEventListener("click", () => setRankIndex(selectedRankIndex + 1));
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
      wheelSuitButton?.addEventListener("click", () => {
        onCycleSuit?.();
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
      updateWheelDial();
      updateCouncilDial();
      updateRankAvailability();
      renderWheelCard();
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
