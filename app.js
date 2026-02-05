const chipsValue = document.getElementById("chipsValue");
const statusLine = document.getElementById("statusLine");
const cardGrid = document.getElementById("cardGrid");
const cardDetail = document.getElementById("cardDetail");
const fullDeckList = document.getElementById("fullDeckList");
const battleSlots = document.getElementById("battleSlots");
const huntSlots = document.getElementById("huntSlots");
const totalCards = document.getElementById("totalCards");
const totalUpgrades = document.getElementById("totalUpgrades");
const activeSuitLabel = document.getElementById("activeSuitLabel");
const collectionEmpty = document.getElementById("collectionEmpty");

const suitTabs = Array.from(document.querySelectorAll(".suit-btn"));
const suitButton = document.getElementById("suitButton");
const suitIcon = document.getElementById("suitIcon");
const powerToggle = document.getElementById("powerToggle");
const powerToggleDock = document.getElementById("powerToggleDock");
const packButtons = Array.from(document.querySelectorAll("[data-pack]"));

const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const wheelRanksOrder = [...ranks.slice(1), ranks[0]];
const councils = ["N","E","S","W"];
const councilNames = {
  N: "North",
  E: "East",
  S: "South",
  W: "West"
};
const suitCycle = [
  { name: "Clubs", icon: "\u2663", color: "#6a00ff" },
  { name: "Hearts", icon: "\u2665", color: "#ff0033" },
  { name: "Diamonds", icon: "\u2666", color: "#00ccff" },
  { name: "Spades", icon: "\u2660", color: "#ff8800" }
];
const suits = [
  { name: "Hearts", key: "H", enabled: true },
  { name: "Spades", key: "S", enabled: true },
  { name: "Diamonds", key: "D", enabled: true },
  { name: "Clubs", key: "C", enabled: true }
];
const HUNT_STORAGE_KEY = "huntParties";
const COLLECTION_STORAGE_KEY = "collection";
const BATTLE_STORAGE_KEY = "battleDecks";
const CHIPS_STORAGE_KEY = "chips";

let chips = 1200;
let activeSuit = "Hearts";
let selectedCardId = null;
const collection = {};
const battleDecks = {
  Hearts: [],
  Spades: [],
  Diamonds: [],
  Clubs: []
};
function getDefaultHuntParties(){
  return {
    Hearts: [],
    Spades: [],
    Diamonds: [],
    Clubs: []
  };
}
const huntParties = getDefaultHuntParties();
let cycleIndex = 0;

function loadHuntPartiesFromStorage(){
  try {
    const raw = window.localStorage.getItem(HUNT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    Object.keys(huntParties).forEach(suit => {
      const party = parsed[suit];
      if (Array.isArray(party)) {
        huntParties[suit] = party.filter(id => typeof id === "string");
      }
    });
  } catch {}
}

function persistHuntParties(){
  try {
    window.localStorage.setItem(HUNT_STORAGE_KEY, JSON.stringify(huntParties));
  } catch {}
}

function announceHuntPartyChange(){
  try {
    window.dispatchEvent(new CustomEvent("hunt-party-changed", {
      detail: {
        suit: activeSuit,
        party: huntParties[activeSuit]?.slice() ?? []
      }
    }));
  } catch {}
}

function loadCollectionFromStorage(){
  try {
    const raw = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    Object.entries(parsed).forEach(([id, meta]) => {
      if (!meta || typeof meta !== "object") return;
      const count = Number(meta.count);
      const level = Number(meta.level);
      if (!Number.isFinite(count) || count < 0) return;
      collection[id] = {
        count,
        level: Number.isFinite(level) && level > 0 ? level : 1
      };
    });
  } catch {}
}

function persistCollection(){
  try {
    window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  } catch {}
}

function loadBattleDecksFromStorage(){
  try {
    const raw = window.localStorage.getItem(BATTLE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    Object.keys(battleDecks).forEach(suit => {
      const deck = parsed[suit];
      if (Array.isArray(deck)) {
        battleDecks[suit] = deck.filter(id => typeof id === "string");
      }
    });
  } catch {}
}

function persistBattleDecks(){
  try {
    window.localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(battleDecks));
  } catch {}
}

function loadChipsFromStorage(){
  try {
    const raw = window.localStorage.getItem(CHIPS_STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      chips = parsed;
    }
  } catch {}
}

function persistChips(){
  try {
    window.localStorage.setItem(CHIPS_STORAGE_KEY, String(chips));
  } catch {}
}

function basePower(rank){
  const order = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  return order.indexOf(rank) + 1;
}

function getCardsForSuit(suit){
  return ranks.map(rank => ({
    id: `${suit}-${rank}`,
    rank,
    suit,
    power: basePower(rank)
  }));
}

const cardsBySuit = {
  Hearts: getCardsForSuit("Hearts"),
  Spades: getCardsForSuit("Spades"),
  Diamonds: getCardsForSuit("Diamonds"),
  Clubs: getCardsForSuit("Clubs")
};

const suitToSymbol = {
  Hearts: "\u2665",
  Spades: "\u2660",
  Diamonds: "\u2666",
  Clubs: "\u2663"
};

function setStatus(message){
  if (statusLine) statusLine.textContent = message;
}

function updateChips(){
  if (chipsValue) chipsValue.textContent = chips.toString();
  persistChips();
}

function ensureCard(id){
  if (!collection[id]) {
    collection[id] = { count: 0, level: 1 };
  }
}

function addCard(id){
  ensureCard(id);
  collection[id].count += 1;
  persistCollection();
}

function addCardCopies(id, count){
  ensureCard(id);
  collection[id].count += count;
  persistCollection();
}

function upgradeCard(id){
  if (!collection[id]) return;
  if (collection[id].count < 2) {
    setStatus("Need a duplicate to upgrade.");
    return;
  }
  collection[id].count -= 1;
  collection[id].level += 1;
  persistCollection();
  setStatus("Card upgraded.");
  renderAll();
}

function cardDisplayName(card){
  return `${card.rank} of ${card.suit}`;
}

function renderCollection(){
  if (!cardGrid) return;
  const cards = cardsBySuit[activeSuit];
  cardGrid.innerHTML = "";
  cards.forEach((card, i) => {
    const meta = collection[card.id] || { count: 0, level: 1 };
    const btn = document.createElement("button");
    btn.className = "card-item";
    btn.style.animationDelay = `${i * 0.02}s`;
    btn.innerHTML = `
      <div>
        <div class="card-rank">${card.rank}</div>
        <div class="card-suit">${card.suit}</div>
      </div>
      <div class="card-meta">
        <span>Lv ${meta.level}</span>
        <span class="card-count">x${meta.count}</span>
      </div>
    `;
    btn.addEventListener("click", () => selectCard(card.id));
    cardGrid.appendChild(btn);
  });
}

function renderCardDetail(){
  if (!cardDetail) return;
  if (!selectedCardId) {
    cardDetail.innerHTML = `
      <div class="panel-title">Card Viewer</div>
      <div class="viewer-empty">Select a card to view details.</div>
    `;
    return;
  }

  const [suitName, council, rank] = selectedCardId.split("-");
  const card = cardsBySuit[suitName].find(c => c.rank === rank);
  const meta = collection[selectedCardId] || { count: 0, level: 1 };
  const power = card.power + (meta.level - 1) * 2;
  const councilLabel = councilNames[council] || council;

  cardDetail.innerHTML = `
    <div class="panel-title">Card Viewer</div>
    <div class="viewer-card">
      <div class="viewer-title">${cardDisplayName(card)} - ${councilLabel}</div>
      <div class="viewer-sub">Base power ${card.power}</div>
      <div class="viewer-stats">
        <div class="viewer-stat">Level: ${meta.level}</div>
        <div class="viewer-stat">Copies: ${meta.count}</div>
        <div class="viewer-stat">Power: ${power}</div>
        <div class="viewer-stat">Suit: ${card.suit}</div>
      </div>
      <div class="viewer-actions">
        <button class="btn primary" id="btnAddToBattle">Add to Battle Deck</button>
        <button class="btn ghost" id="btnUpgradeCard">Upgrade</button>
      </div>
    </div>
  `;

  document.getElementById("btnAddToBattle")?.addEventListener("click", () => addToBattle(selectedCardId));
  document.getElementById("btnUpgradeCard")?.addEventListener("click", () => upgradeCard(selectedCardId));
}

function renderFullDeck(){
  if (!fullDeckList) return;
  fullDeckList.innerHTML = "";
  Object.entries(collection).forEach(([id, meta]) => {
    const [suitName, council, rank] = id.split("-");
    if (suitName !== activeSuit) return;
    const row = document.createElement("div");
    row.className = "deck-row";
    row.innerHTML = `
      <span>${rank} of ${suitName} (${councilNames[council] || council})</span>
      <span>x${meta.count} | Lv ${meta.level}</span>
    `;
    fullDeckList.appendChild(row);
  });
}

function renderBattleDeck(){
  if (!battleSlots) return;
  battleSlots.innerHTML = "";
  const deck = battleDecks[activeSuit];
  const maxSlots = 5;
  for (let i = 0; i < maxSlots; i += 1) {
    const slot = document.createElement("div");
    const cardId = deck[i];
    slot.className = "slot" + (cardId ? " filled" : "");
    if (cardId) {
      const [suitName, council, rank] = cardId.split("-");
      slot.innerHTML = `
        <span>${rank} of ${suitName} (${councilNames[council] || council})</span>
        <button data-remove="${cardId}">Remove</button>
      `;
    } else {
      slot.textContent = "Empty slot";
    }
    battleSlots.appendChild(slot);
  }
  Array.from(battleSlots.querySelectorAll("button[data-remove]")).forEach(btn => {
    btn.addEventListener("click", () => removeFromBattle(btn.dataset.remove));
  });
}

function renderHuntParty(){
  if (!huntSlots) return;
  huntSlots.innerHTML = "";
  const party = huntParties[activeSuit];
  const maxSlots = 5;
  for (let i = 0; i < maxSlots; i += 1) {
    const slot = document.createElement("div");
    const cardId = party[i];
    slot.className = "slot" + (cardId ? " filled" : "");
    if (cardId) {
      const [suitName, council, rank] = cardId.split("-");
      slot.innerHTML = `
        <span>${rank} of ${suitName} (${councilNames[council] || council})</span>
        <button data-remove="${cardId}">Remove</button>
      `;
    } else {
      slot.textContent = "Empty slot";
    }
    huntSlots.appendChild(slot);
  }
  Array.from(huntSlots.querySelectorAll("button[data-remove]")).forEach(btn => {
    btn.addEventListener("click", () => removeFromHunt(btn.dataset.remove));
  });
}

function selectCard(id){
  selectedCardId = id;
  renderCardDetail();
}

function addToBattle(id){
  if (!collection[id] || collection[id].count < 1) {
    setStatus("You do not own this card yet.");
    return;
  }
  const deck = battleDecks[activeSuit];
  if (deck.includes(id)) {
    setStatus("That card is already in the battle deck.");
    return;
  }
  if (deck.length >= 5) {
    setStatus("Battle deck is full.");
    return;
  }
  deck.push(id);
  persistBattleDecks();
  setStatus("Card added to battle deck.");
  renderBattleDeck();
}

function removeFromBattle(id){
  const deck = battleDecks[activeSuit];
  const index = deck.indexOf(id);
  if (index >= 0) deck.splice(index, 1);
  persistBattleDecks();
  renderBattleDeck();
}

function clearBattleDeck(){
  battleDecks[activeSuit].length = 0;
  persistBattleDecks();
  renderBattleDeck();
  setStatus("Battle deck cleared.");
}

function addToHunt(id){
  if (!collection[id] || collection[id].count < 1) {
    setStatus("You do not own this card yet.");
    return;
  }
  const party = huntParties[activeSuit];
  if (party.includes(id)) {
    setStatus("That card is already in the hunt party.");
    return;
  }
  if (party.length >= 5) {
    setStatus("Hunt party is full.");
    return;
  }
  party.push(id);
  setStatus("Card added to hunt party.");
  renderHuntParty();
  persistHuntParties();
  announceHuntPartyChange();
}

function removeFromHunt(id){
  const party = huntParties[activeSuit];
  const index = party.indexOf(id);
  if (index >= 0) party.splice(index, 1);
  renderHuntParty();
  persistHuntParties();
  announceHuntPartyChange();
}

function clearHuntParty(){
  huntParties[activeSuit].length = 0;
  renderHuntParty();
  setStatus("Hunt party cleared.");
  persistHuntParties();
  announceHuntPartyChange();
}

function updateProfileStats(){
  if (!totalCards || !totalUpgrades) return;
  let total = 0;
  let upgrades = 0;
  Object.values(collection).forEach(meta => {
    total += meta.count;
    upgrades += meta.level - 1;
  });
  if (totalCards) totalCards.textContent = total.toString();
  if (totalUpgrades) totalUpgrades.textContent = upgrades.toString();
}

function getTotalCards(){
  let total = 0;
  Object.values(collection).forEach(meta => {
    total += meta.count;
  });
  return total;
}

function getTotalCardsForSuit(suitName){
  let total = 0;
  Object.entries(collection).forEach(([id, meta]) => {
    const [suit] = id.split("-");
    if (suit === suitName) total += meta.count;
  });
  return total;
}

function weightedPick(items, weights){
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateStarterDeck(){
  const suitName = activeSuit;
  const commonRanks = ["2","3","4","5","6"];
  const rareRanks = ["7","8","9","10"];
  const ultraRanks = ["J","Q","K","A"];
  const commonWeights = [5,4,3,2,1];
  const rareWeights = [3,2,2,1];
  const ultraWeights = [2,2,1,1];
  const councilPool = councils.slice();

  for (let i = 0; i < 10; i += 1) {
    const rank = weightedPick(commonRanks, commonWeights);
    const council = councilPool[Math.floor(Math.random() * councilPool.length)];
    addCardCopies(`${suitName}-${council}-${rank}`, 1);
  }
  for (let i = 0; i < 3; i += 1) {
    const rank = weightedPick(rareRanks, rareWeights);
    const council = councilPool[Math.floor(Math.random() * councilPool.length)];
    addCardCopies(`${suitName}-${council}-${rank}`, 1);
  }
  for (let i = 0; i < 2; i += 1) {
    const rank = weightedPick(ultraRanks, ultraWeights);
    const council = councilPool[Math.floor(Math.random() * councilPool.length)];
    addCardCopies(`${suitName}-${council}-${rank}`, 1);
  }
  setStatus(`${suitName} suit deck generated.`);
  renderAll();
}

function updateCollectionEmptyState(){
  const hasCards = getTotalCardsForSuit(activeSuit) > 0;
  if (collectionEmpty) {
    collectionEmpty.style.display = hasCards ? "none" : "block";
  }
  const host = document.getElementById("wheelModuleHost");
  if (host) host.style.display = hasCards ? "block" : "none";
}

function buyPack(size, cost){
  if (chips < cost) {
    setStatus("Not enough chips.");
    return;
  }
  if (!suits.find(s => s.name === activeSuit && s.enabled)) {
    setStatus("This suit is locked.");
    return;
  }
  chips -= cost;
  updateChips();
  const cards = cardsBySuit[activeSuit];
  for (let i = 0; i < size; i += 1) {
    const card = cards[Math.floor(Math.random() * cards.length)];
    const council = councils[Math.floor(Math.random() * councils.length)];
    addCard(`${card.suit}-${council}-${card.rank}`);
  }
  setStatus(`You opened a ${size}-card pack.`);
  renderAll();
}

function setActiveSuit(suitName){
  const suit = suits.find(s => s.name === suitName);
  if (!suit || !suit.enabled) {
    setStatus("Suit locked for now.");
    return;
  }
  activeSuit = suitName;
  if (deckSelector?.isActive) {
    deckSelector.setActiveSuit(activeSuit);
  } else {
    selectedCardId = null;
  }
  suitTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.suit === suitName));
  if (activeSuitLabel) activeSuitLabel.textContent = suitName;
  if (document.body) {
    document.body.dataset.suit = suitName.toLowerCase();
  }
  try {
    window.localStorage.setItem("activeSuit", suitName);
  } catch {}
  syncSuitButton();
  renderAll();
  announceHuntPartyChange();
}


function renderAll(){
  if (deckSelector?.isActive) {
    deckSelector.render();
  } else {
    renderCollection();
    renderCardDetail();
  }
  renderFullDeck();
  renderBattleDeck();
  renderHuntParty();
  updateProfileStats();
  updateCollectionEmptyState();
}

function initMenuDrawers(){
  if (document.body) {
    document.body.classList.add("menu-only");
  }
  const topPanels = Array.from(document.querySelectorAll(".top-menu-panel"));
  topPanels.forEach(panel => {
    panel.classList.add("menu-drawer");
    let tab = panel.querySelector(".menu-tab");
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "menu-tab";
      tab.textContent = "Screen Menu";
      panel.prepend(tab);
    }
    const screenLinks = panel.querySelector(".screen-links");
    if (screenLinks && !screenLinks.parentElement.classList.contains("menu-body")) {
      const wrap = document.createElement("div");
      wrap.className = "menu-body";
      screenLinks.parentNode.insertBefore(wrap, screenLinks);
      wrap.appendChild(screenLinks);
    }
    panel.classList.add("collapsed");
    tab.addEventListener("click", () => panel.classList.toggle("collapsed"));
  });

  const bottomDrawers = Array.from(document.querySelectorAll(".bottom-drawer"));
  bottomDrawers.forEach(drawer => {
    const tab = drawer.querySelector("[data-drawer-toggle]");
    if (!tab) return;
    tab.addEventListener("click", () => drawer.classList.toggle("collapsed"));
  });
}

function initCmsViews(){
  const viewButtons = Array.from(document.querySelectorAll("[data-view-target]"));
  const views = Array.from(document.querySelectorAll(".cms-view"));
  if (!viewButtons.length || !views.length) return;

  const setView = (viewName) => {
    views.forEach(view => view.classList.toggle("is-active", view.dataset.view === viewName));
    viewButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.viewTarget === viewName));
  };

  viewButtons.forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
  });

  let initial = viewButtons.find(btn => btn.classList.contains("active"))?.dataset.viewTarget
    || viewButtons[0].dataset.viewTarget;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view");
  if (requested && views.some(view => view.dataset.view === requested)) {
    initial = requested;
  }
  setView(initial);
}

function initMobileSections(){
  const tabsWrap = document.querySelector(".mobile-section-tabs");
  if (!tabsWrap) return;
  const tabs = Array.from(tabsWrap.querySelectorAll("[data-section]"));
  const panels = Array.from(document.querySelectorAll(".panel[data-mobile-section]"));
  if (!tabs.length || !panels.length) return;

  const setActive = (section) => {
    tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.section === section));
    panels.forEach(panel => panel.classList.toggle("mobile-active", panel.dataset.mobileSection === section));
  };

  tabs.forEach(btn => btn.addEventListener("click", () => setActive(btn.dataset.section)));
  const initial = tabs.find(btn => btn.classList.contains("active"))?.dataset.section || tabs[0].dataset.section;
  setActive(initial);
}

const deckSelector = window.DeckSelector?.create({
  wheelRanksOrder,
  councils,
  councilNames,
  suitToSymbol,
  suitCycle,
  getActiveSuit: () => activeSuit,
  getCardsBySuit: () => cardsBySuit,
  getCollection: () => collection,
  onAddToBattle: addToBattle,
  onUpgrade: upgradeCard,
  onSelectionChange: ({ cardId }) => {
    selectedCardId = cardId;
    updateConsoleActions();
  }
}) || null;

function updateConsoleActions(){
  const addBtn = document.getElementById("btnConsoleAddToBattle");
  const huntBtn = document.getElementById("btnConsoleAddToHunt");
  const upgradeBtn = document.getElementById("btnConsoleUpgradeCard");
  if (!addBtn && !huntBtn && !upgradeBtn) return;
  if (!selectedCardId) {
    if (addBtn) addBtn.disabled = true;
    if (huntBtn) huntBtn.disabled = true;
    if (upgradeBtn) upgradeBtn.disabled = true;
    return;
  }
  const meta = collection[selectedCardId];
  const owned = meta && meta.count > 0;
  const battleFull = battleDecks[activeSuit]?.length >= 5;
  const huntFull = huntParties[activeSuit]?.length >= 5;
  if (addBtn) {
    addBtn.disabled = !owned || battleFull || battleDecks[activeSuit]?.includes(selectedCardId);
  }
  if (huntBtn) {
    huntBtn.disabled = !owned || huntFull || huntParties[activeSuit]?.includes(selectedCardId);
  }
  if (upgradeBtn) {
    upgradeBtn.disabled = !owned;
  }
}

function syncSuitButton(){
  if (!suitButton || !suitIcon) return;
  const data = suitCycle.find(item => item.name === activeSuit);
  if (!data) return;
  suitButton.style.setProperty("--c", data.color);
  suitIcon.textContent = data.icon;
  cycleIndex = suitCycle.indexOf(data);
}


suitTabs.forEach(tab => {
  tab.addEventListener("click", () => setActiveSuit(tab.dataset.suit));
});

if (suitButton) {
  suitButton.addEventListener("click", () => {
    cycleIndex = (cycleIndex + 1) % suitCycle.length;
    setActiveSuit(suitCycle[cycleIndex].name);
    suitButton.classList.remove("swap");
    void suitButton.offsetWidth;
    suitButton.classList.add("swap");
    window.setTimeout(() => suitButton.classList.remove("swap"), 520);
    suitButton.classList.remove("anim");
    void suitButton.offsetWidth;
    suitButton.classList.add("anim");
    window.setTimeout(() => suitButton.classList.remove("anim"), 800);
  });
}

packButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const size = Number(btn.dataset.pack || 0);
    const cost = Number(btn.dataset.cost || 0);
    buyPack(size, cost);
  });
});

document.getElementById("btnClearBattle")?.addEventListener("click", clearBattleDeck);
document.getElementById("btnClearHunt")?.addEventListener("click", clearHuntParty);
document.getElementById("btnAddChips")?.addEventListener("click", () => {
  chips += 500;
  updateChips();
  setStatus("Added 500 chips.");
});
document.querySelectorAll("[data-generate-deck]").forEach(btn => {
  btn.addEventListener("click", generateStarterDeck);
});

document.getElementById("btnConsoleAddToBattle")?.addEventListener("click", () => {
  if (!selectedCardId) return;
  addToBattle(selectedCardId);
});
document.getElementById("btnConsoleAddToHunt")?.addEventListener("click", () => {
  if (!selectedCardId) return;
  addToHunt(selectedCardId);
});
document.getElementById("btnConsoleUpgradeCard")?.addEventListener("click", () => {
  if (!selectedCardId) return;
  upgradeCard(selectedCardId);
});

loadChipsFromStorage();
try {
  const storedSuit = window.localStorage.getItem("activeSuit");
  if (storedSuit && suits.find(s => s.name === storedSuit)) {
    activeSuit = storedSuit;
  }
} catch {}
loadCollectionFromStorage();
loadBattleDecksFromStorage();
loadHuntPartiesFromStorage();
updateChips();
if (document.body) document.body.dataset.suit = activeSuit.toLowerCase();
syncSuitButton();
renderAll();
initMenuDrawers();
initCmsViews();
initMobileSections();
updateConsoleActions();
announceHuntPartyChange();


function setPowerState(isOn){
  if (!document.body) return;
  document.body.dataset.power = isOn ? "on" : "off";
  try {
    window.localStorage.setItem("powerState", isOn ? "on" : "off");
  } catch {}
  syncPowerToggles(isOn);
}

function syncPowerToggles(isOn){
  if (powerToggle) powerToggle.checked = isOn;
  if (powerToggleDock) powerToggleDock.checked = isOn;
}

if (powerToggle) {
  powerToggle.addEventListener("change", () => setPowerState(powerToggle.checked));
}
if (powerToggleDock) {
  powerToggleDock.addEventListener("change", () => setPowerState(powerToggleDock.checked));
}

try {
  const storedPower = window.localStorage.getItem("powerState");
  if (storedPower) {
    const on = storedPower === "on";
    syncPowerToggles(on);
    setPowerState(on);
  } else {
    setPowerState(true);
    syncPowerToggles(true);
  }
} catch {
  setPowerState(true);
  syncPowerToggles(true);
}

