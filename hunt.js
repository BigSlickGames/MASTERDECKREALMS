// HUNT MODULE GUIDE
// This file controls HUNT screen behavior: team slots, picker, and launching the Council Hunt iframe.
// Beginner tips:
// - Change maxSlots in renderHuntPanel() to adjust team size.
// - Edit buildHuntGameSrc() to point to a different mini game.
// - Update status copy in renderHuntPanel() and launchHuntGame().
// - Scaling is handled in fitHuntGame() and fits to .hunt-game-shell size.
(() => {
  const huntStatusEl = document.getElementById("huntStatus");
  const huntLaunchEl = document.getElementById("huntLaunch");
  const huntTeamGridEl = document.getElementById("huntTeamGrid");
  const huntBadgeEl = document.getElementById("huntBadge");
  const huntPickerEl = document.getElementById("huntPicker");
  const huntPickerListEl = document.getElementById("huntPickerList");
  const huntPickerCloseEl = document.getElementById("huntPickerClose");
  const huntManageBtn = document.getElementById("huntManage");
  const huntGamePanel = document.getElementById("huntGamePanel");
  const huntGameShell = document.querySelector(".hunt-game-shell");
  const huntGameIframe = document.getElementById("huntGameIframe");

  if (!huntStatusEl || !huntLaunchEl || !huntTeamGridEl) return;

  const suits = ["Hearts","Spades","Diamonds","Clubs"];
  const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const councilNames = {
    N: "North",
    E: "East",
    S: "South",
    W: "West"
  };

  const huntStorageKey = "huntParties";
  const collectionStorageKey = "collection";
  let gameStarted = false;
  let resizeObserver = null;

  function getActiveSuitName() {
    try {
      const stored = window.localStorage.getItem("activeSuit");
      return suits.includes(stored) ? stored : "Hearts";
    } catch {
      return "Hearts";
    }
  }

  function loadHuntParties() {
    const fallback = {
      Hearts: [],
      Spades: [],
      Diamonds: [],
      Clubs: []
    };
    try {
      const raw = window.localStorage.getItem(huntStorageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;
      Object.keys(fallback).forEach(suit => {
        if (Array.isArray(parsed[suit])) {
          fallback[suit] = parsed[suit].filter(id => typeof id === "string");
        }
      });
      return fallback;
    } catch {
      return fallback;
    }
  }

  function persistHuntParties(parties) {
    try {
      window.localStorage.setItem(huntStorageKey, JSON.stringify(parties));
    } catch {}
  }

  function loadCollection() {
    try {
      const raw = window.localStorage.getItem(collectionStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function announceHuntPartyChange(suitName, party) {
    try {
      window.dispatchEvent(new CustomEvent("hunt-party-changed", {
        detail: {
          suit: suitName,
          party: party.slice()
        }
      }));
    } catch {}
  }

  function formatHuntCard(id) {
    if (!id || typeof id !== "string") return "Unknown card";
    const parts = id.split("-");
    if (parts.length < 3) return id;
    const [suitName, council, rank] = parts;
    const councilLabel = councilNames[council] || council;
    return `${rank} of ${suitName} (${councilLabel})`;
  }

  function parseCardId(id) {
    if (!id || typeof id !== "string") return null;
    const parts = id.split("-");
    if (parts.length < 3) return null;
    const [suitName, council, rank] = parts;
    return { suitName, council, rank };
  }

  function getAvailableHuntCards(suitName, party) {
    const collection = loadCollection();
    const partySet = new Set(party);
    return Object.entries(collection)
      .filter(([id, meta]) => {
        const parsed = parseCardId(id);
        if (!parsed) return false;
        if (parsed.suitName !== suitName) return false;
        if (partySet.has(id)) return false;
        const count = Number(meta?.count ?? 0);
        return Number.isFinite(count) && count > 0;
      })
      .map(([id, meta]) => {
        const parsed = parseCardId(id);
        return {
          id,
          suitName: parsed.suitName,
          council: parsed.council,
          rank: parsed.rank,
          count: Number(meta?.count ?? 0),
          level: Number(meta?.level ?? 1)
        };
      })
      .sort((a, b) => {
        const rankA = ranks.indexOf(a.rank);
        const rankB = ranks.indexOf(b.rank);
        if (rankA !== rankB) return rankA - rankB;
        return a.council.localeCompare(b.council);
      });
  }

  function openHuntPicker() {
    if (!huntPickerEl || !huntPickerListEl) return;
    const suitName = getActiveSuitName();
    const parties = loadHuntParties();
    const party = parties[suitName] || [];
    const options = getAvailableHuntCards(suitName, party);

    huntPickerListEl.innerHTML = "";
    if (!options.length) {
      const empty = document.createElement("div");
      empty.className = "hunt-option";
      empty.textContent = `No owned ${suitName} cards available. Generate a deck or open packs in the store.`;
      huntPickerListEl.appendChild(empty);
    } else {
      options.forEach(option => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hunt-option";
        btn.innerHTML = `
          <span>${formatHuntCard(option.id)}</span>
          <span class="hunt-option-meta">x${option.count} · Lv ${option.level}</span>
        `;
        btn.addEventListener("click", () => {
          addToHuntParty(option.id);
          closeHuntPicker();
        });
        huntPickerListEl.appendChild(btn);
      });
    }

    huntPickerEl.hidden = false;
    try {
      huntPickerEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {}
  }

  function closeHuntPicker() {
    if (huntPickerEl) huntPickerEl.hidden = true;
  }

  function addToHuntParty(cardId) {
    const suitName = getActiveSuitName();
    const parties = loadHuntParties();
    const party = parties[suitName] || [];
    if (party.includes(cardId)) {
      huntStatusEl.textContent = "That card is already in the hunt team.";
      return;
    }
    if (party.length >= 5) {
      huntStatusEl.textContent = "Hunt team is full.";
      return;
    }
    party.push(cardId);
    parties[suitName] = party;
    persistHuntParties(parties);
    announceHuntPartyChange(suitName, party);
    renderHuntPanel();
  }

  function removeFromHuntParty(cardId) {
    const suitName = getActiveSuitName();
    const parties = loadHuntParties();
    const party = parties[suitName] || [];
    const index = party.indexOf(cardId);
    if (index < 0) return;
    party.splice(index, 1);
    parties[suitName] = party;
    persistHuntParties(parties);
    announceHuntPartyChange(suitName, party);
    renderHuntPanel();
  }

  function setLaunchState() {
    if (!huntLaunchEl) return;
    huntLaunchEl.disabled = false;
    huntLaunchEl.setAttribute("aria-disabled", "false");
  }

  function resolveHuntTeam() {
    const parties = loadHuntParties();
    const requestedSuit = getActiveSuitName();
    let suitName = requestedSuit;
    let party = parties[suitName] || [];
    let usingFallback = false;
    if (!party.length) {
      const fallback = Object.entries(parties).find(([, list]) => Array.isArray(list) && list.length);
      if (fallback) {
        suitName = fallback[0];
        party = fallback[1];
        usingFallback = true;
      }
    }
    return { parties, requestedSuit, suitName, party, usingFallback };
  }

  function buildHuntGameSrc(suitName, party) {
    const params = new URLSearchParams();
    params.set("suit", suitName);
    params.set("party", party.join("|"));
    params.set("t", Date.now().toString());
    return `./council-hunt/index.html?${params.toString()}`;
  }

  function fitHuntGame() {
    if (!huntGameShell || !huntGameIframe) return;
    const doc = huntGameIframe.contentDocument;
    if (!doc) return;
    const app = doc.getElementById("app") || doc.body;
    if (!app) return;
    const nativeWidth = Math.max(app.scrollWidth, 1);
    const nativeHeight = Math.max(app.scrollHeight, 1);
    const containerWidth = Math.max(huntGameShell.clientWidth, 1);
    const containerHeight = Math.max(huntGameShell.clientHeight, 1);
    const scale = Math.min(containerWidth / nativeWidth, containerHeight / nativeHeight, 1);

    huntGameIframe.style.width = `${nativeWidth}px`;
    huntGameIframe.style.height = `${nativeHeight}px`;
    huntGameIframe.style.transform = `scale(${scale})`;
  }

  function launchHuntGame(suitName, party) {
    if (!huntGamePanel || !huntGameIframe) return;
    const src = buildHuntGameSrc(suitName, party);
    huntGamePanel.hidden = false;
    huntGameIframe.setAttribute("src", src);
    gameStarted = true;
    huntStatusEl.textContent = "Launching Council Hunt...";
    try {
      huntGamePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  }

  function renderHuntPanel() {
    const { suitName, party, requestedSuit, usingFallback } = resolveHuntTeam();
    const ready = party.length > 0;

    if (!ready) {
      huntStatusEl.textContent = `Hunt team empty for ${requestedSuit}. You can still launch.`;
    } else if (usingFallback && requestedSuit !== suitName) {
      huntStatusEl.textContent = `Using ${suitName} hunt team (${party.length} card(s)).`;
    } else {
      huntStatusEl.textContent = `Hunt team ready for ${suitName}. ${party.length} card(s) assigned.`;
    }

    setLaunchState();
    huntBadgeEl?.classList.toggle("active", ready);

    huntTeamGridEl.innerHTML = "";
    const maxSlots = 5;
    for (let i = 0; i < maxSlots; i += 1) {
      const cardId = party[i];
      if (cardId) {
        const slot = document.createElement("div");
        slot.className = "slot filled";
        slot.innerHTML = `
          <span>${formatHuntCard(cardId)}</span>
          <button type="button" data-remove="${cardId}">Remove</button>
        `;
        const removeBtn = slot.querySelector("button[data-remove]");
        removeBtn?.addEventListener("click", (event) => {
          event.stopPropagation();
          removeFromHuntParty(cardId);
        });
        huntTeamGridEl.appendChild(slot);
      } else {
        if (usingFallback && requestedSuit !== suitName) {
          const slot = document.createElement("div");
          slot.className = "slot empty";
          slot.innerHTML = `<span class="slot-label">SWITCH SUIT TO ADD</span>`;
          huntTeamGridEl.appendChild(slot);
        } else {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "slot empty";
          button.innerHTML = `<span class="slot-label">ADD HUNTING CARD</span>`;
          button.addEventListener("click", () => openHuntPicker());
          huntTeamGridEl.appendChild(button);
        }
      }
    }

    if (huntPickerEl && !huntPickerEl.hidden) {
      openHuntPicker();
    }

    if (gameStarted) {
      const nextSrc = buildHuntGameSrc(suitName, party);
      const currentSrc = huntGameIframe?.getAttribute("src") || "";
      if (currentSrc && currentSrc !== nextSrc) {
        huntGameIframe.setAttribute("src", nextSrc);
      }
    }
  }

  huntManageBtn?.addEventListener("click", () => {
    if (!huntPickerEl) return;
    if (huntPickerEl.hidden) {
      openHuntPicker();
    } else {
      closeHuntPicker();
    }
  });

  huntPickerCloseEl?.addEventListener("click", closeHuntPicker);

  huntLaunchEl.addEventListener("click", () => {
    const { suitName, party } = resolveHuntTeam();
    launchHuntGame(suitName, party);
  });

  huntGameIframe?.addEventListener("load", () => {
    if (gameStarted) {
      huntStatusEl.textContent = "Council Hunt ready.";
      fitHuntGame();
    }
  });

  if (huntGameShell && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      if (gameStarted) fitHuntGame();
    });
    resizeObserver.observe(huntGameShell);
  } else {
    window.addEventListener("resize", () => {
      if (gameStarted) fitHuntGame();
    });
  }

  window.addEventListener("hunt-party-changed", renderHuntPanel);

  renderHuntPanel();
})();
