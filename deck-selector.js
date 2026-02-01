(() => {
  const DEFAULT_TEMPLATE = `
<div class="deck-selector" id="deckSelector">
  <div class="deck-stage">
    <div class="deck-stack" aria-hidden="true">
      <span class="deck-slab"></span>
      <span class="deck-slab"></span>
      <span class="deck-slab"></span>
    </div>
    <div class="deck-card" id="deckCard">
      <div class="deck-card-header">
        <div class="deck-card-rank" id="deckCardRank">2</div>
        <div class="deck-card-suit" id="deckCardSuit">&#x2665;</div>
      </div>
      <div class="deck-card-title" id="deckCardTitle">2 OF HEARTS - NORTH</div>
      <div class="deck-card-owned" id="deckCardOwned">CARD NOT OWNED</div>
      <div class="deck-card-stats" id="deckCardStats">
        <div class="deck-card-stat" id="deckStatLevel">Level: 1</div>
        <div class="deck-card-stat" id="deckStatCopies">Copies: 0</div>
        <div class="deck-card-stat" id="deckStatPower">Power: 1</div>
        <div class="deck-card-stat" id="deckStatSuit">Suit: Hearts</div>
      </div>
    </div>
    <div class="deck-overlay" aria-label="Council navigation">
      <button class="deck-arrow up" data-dir="up" data-council="N" aria-label="North cards">N</button>
      <button class="deck-arrow right" data-dir="right" data-council="E" aria-label="East cards">E</button>
      <button class="deck-arrow down" data-dir="down" data-council="S" aria-label="South cards">S</button>
      <button class="deck-arrow left" data-dir="left" data-council="W" aria-label="West cards">W</button>
      <div class="deck-center-label" id="deckCouncilLabel">NORTH COUNCIL</div>
    </div>
  </div>
</div>
`.trim();

  function create(config = {}) {
    const {
      hostId = "wheelModuleHost",
      templateUrl = "./deck-selector.html",
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
      onSelectionChange
    } = config;

    let deckSelector = null;
    let deckCard = null;
    let deckCardRank = null;
    let deckCardSuit = null;
    let deckCardTitle = null;
    let deckCardOwned = null;
    let deckCardStats = null;
    let deckStatLevel = null;
    let deckStatCopies = null;
    let deckStatPower = null;
    let deckStatSuit = null;
    let deckCouncilLabel = null;
    let deckArrows = [];

    let isActive = true;
    let mountPromise = null;
    let ready = false;

    const councilStateBySuit = {};

    function bindElements() {
      deckSelector = document.getElementById("deckSelector");
      deckCard = document.getElementById("deckCard");
      deckCardRank = document.getElementById("deckCardRank");
      deckCardSuit = document.getElementById("deckCardSuit");
      deckCardTitle = document.getElementById("deckCardTitle");
      deckCardOwned = document.getElementById("deckCardOwned");
      deckCardStats = document.getElementById("deckCardStats");
      deckStatLevel = document.getElementById("deckStatLevel");
      deckStatCopies = document.getElementById("deckStatCopies");
      deckStatPower = document.getElementById("deckStatPower");
      deckStatSuit = document.getElementById("deckStatSuit");
      deckCouncilLabel = document.getElementById("deckCouncilLabel");
      deckArrows = Array.from(document.querySelectorAll(".deck-arrow"));
    }

    async function mount() {
      if (mountPromise) return mountPromise;
      mountPromise = (async () => {
        const host = document.getElementById(hostId);
        if (!host) {
          isActive = false;
          return false;
        }
        if (!document.getElementById("deckSelector")) {
          try {
            const response = await fetch(templateUrl, { cache: "no-cache" });
            if (!response.ok) throw new Error("Template fetch failed");
            host.innerHTML = await response.text();
          } catch {
            host.innerHTML = DEFAULT_TEMPLATE;
          }
        }
        bindElements();
        return !!deckSelector;
      })();
      return mountPromise;
    }

    function getCouncilState() {
      const suitKey = getActiveSuit?.() || "default";
      if (!councilStateBySuit[suitKey]) {
        councilStateBySuit[suitKey] = {
          activeCouncil: councils[0] || "N",
          indices: {}
        };
      }
      const state = councilStateBySuit[suitKey];
      councils.forEach((council) => {
        if (!Number.isFinite(state.indices[council])) {
          state.indices[council] = 0;
        }
      });
      if (!councils.includes(state.activeCouncil)) {
        state.activeCouncil = councils[0] || "N";
      }
      return state;
    }

    function getSuitColor(suitName) {
      return suitCycle.find(item => item.name === suitName)?.color;
    }

    function setSuitTint() {
      if (!deckSelector) return;
      const activeSuit = getActiveSuit?.() || "";
      const color = getSuitColor(activeSuit) || "#8bb8ff";
      deckSelector.style.setProperty("--suit-color", color);
    }

    function getRankForCouncil(council) {
      if (!wheelRanksOrder.length) return "";
      const state = getCouncilState();
      const index = state.indices[council] || 0;
      const total = wheelRanksOrder.length;
      return wheelRanksOrder[(index + total) % total];
    }

    function updateActiveArrow() {
      const state = getCouncilState();
      deckArrows.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.council === state.activeCouncil);
      });
    }

    function triggerFlick(dir) {
      if (!deckCard) return;
      const className = `flick-${dir}`;
      deckCard.classList.remove("flick-up", "flick-right", "flick-down", "flick-left");
      void deckCard.offsetWidth;
      deckCard.classList.add(className);
      window.setTimeout(() => deckCard.classList.remove(className), 280);
    }

    function renderDeckCard() {
      if (!deckSelector) return;
      const activeSuit = getActiveSuit?.();
      const cardsBySuit = getCardsBySuit?.();
      const collection = getCollection?.();
      if (!activeSuit || !cardsBySuit) return;
      const state = getCouncilState();

      const rank = getRankForCouncil(state.activeCouncil);
      const card = cardsBySuit[activeSuit]?.find(c => c.rank === rank) || cardsBySuit[activeSuit]?.[0];
      if (!card) return;

      const council = state.activeCouncil;
      const cardId = `${activeSuit}-${council}-${card.rank}`;
      const meta = (collection && collection[cardId]) || { count: 0, level: 1 };
      const power = card.power + (meta.level - 1) * 2;
      const councilLabel = councilNames[council] || council;
      const owned = meta.count > 0;

      if (deckCardTitle) {
        deckCardTitle.textContent = `${card.rank} of ${card.suit} - ${councilLabel}`.toUpperCase();
      }
      if (deckCardRank) deckCardRank.textContent = card.rank;
      if (deckCardSuit) deckCardSuit.textContent = suitToSymbol[activeSuit] || "";
      if (deckStatLevel) deckStatLevel.textContent = owned ? `Level: ${meta.level}` : "Level: --";
      if (deckStatCopies) deckStatCopies.textContent = owned ? `Copies: ${meta.count}` : "Copies: 0";
      if (deckStatPower) deckStatPower.textContent = owned ? `Power: ${power}` : "Power: --";
      if (deckStatSuit) deckStatSuit.textContent = `Suit: ${card.suit}`;
      if (deckCardOwned) deckCardOwned.style.display = owned ? "none" : "inline-flex";
      if (deckCardStats) deckCardStats.style.display = owned ? "grid" : "none";
      if (deckCouncilLabel) deckCouncilLabel.textContent = `${councilLabel} COUNCIL`;

      onSelectionChange?.({ cardId, councilIndex: councils.indexOf(council) });
    }

    function setCouncil(council, dir = "up") {
      const state = getCouncilState();
      if (councils.includes(council)) {
        state.activeCouncil = council;
      }
      if (wheelRanksOrder.length) {
        const total = wheelRanksOrder.length;
        state.indices[state.activeCouncil] = (state.indices[state.activeCouncil] + 1 + total) % total;
      }
      updateActiveArrow();
      renderDeckCard();
      triggerFlick(dir);
    }

    async function init() {
      if (ready) return;
      const ok = await mount();
      if (!ok) return;

      deckArrows.forEach((btn) => {
        btn.addEventListener("click", () => {
          const council = btn.dataset.council;
          const dir = btn.dataset.dir || "up";
          setCouncil(council, dir);
        });
      });

      ready = true;
    }

    async function render() {
      await init();
      if (!ready) return;
      setSuitTint();
      updateActiveArrow();
      renderDeckCard();
    }

    async function setActiveSuit() {
      await render();
    }

    return {
      get isActive() { return isActive; },
      render,
      setActiveSuit
    };
  }

  window.DeckSelector = { create };
})();
