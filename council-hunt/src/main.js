import { createGameState, resetEncounter, resetGame, pushLog } from "./state.js";
import {
  getActiveFighter,
  isSquadDefeated,
  applyDamage,
  computePlayerAttackDamage,
  computeEnemyAttackDamage,
  guardMultiplier,
  advanceTurn,
  swapTo
} from "./systems/battle.js";
import { decideEnemyAction } from "./systems/ai.js";
import { applyRecruitAttempt } from "./systems/recruit.js";
import { bindUI } from "./ui/ui.js";

const HUNT_STORAGE_KEY = "huntParties";
const RANK_MAP = { A: 14, K: 13, Q: 12, J: 11 };

function readConsoleActiveSuit() {
  try {
    return window.localStorage.getItem("activeSuit") || "Hearts";
  } catch {
    return "Hearts";
  }
}

function loadConsoleHuntParties() {
  const fallback = {
    Hearts: [],
    Spades: [],
    Diamonds: [],
    Clubs: []
  };
  try {
    const raw = window.localStorage.getItem(HUNT_STORAGE_KEY);
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

function toRankNumber(label) {
  if (!label) return null;
  return RANK_MAP[label] ?? Number(label);
}

function toBlueprint(cardId, fallbackSuit) {
  if (!cardId || typeof cardId !== "string") return null;
  const parts = cardId.split("-");
  if (parts.length < 3) return null;
  const [suitName, council, rankLabel] = parts;
  const rank = toRankNumber(rankLabel);
  if (!Number.isFinite(rank)) return null;
  const suit = (suitName || fallbackSuit || "Hearts").toLowerCase();
  const nameSuit = suitName || fallbackSuit || "Hearts";
  const name = `${rankLabel} of ${nameSuit} (${council})`;
  return { suit, rank, name };
}

function loadHuntContext() {
  const params = new URLSearchParams(window.location.search);
  const partyParam = params.get("party");
  const suitParam = params.get("suit");
  if (partyParam) {
    const suitName = suitParam || "Hearts";
    const party = partyParam.split("|").filter(Boolean);
    const squadBlueprint = party.map(id => toBlueprint(id, suitName)).filter(Boolean);
    return {
      ready: squadBlueprint.length > 0,
      suitName,
      suitKey: suitName.toLowerCase(),
      squadBlueprint,
      requestedSuit: suitName
    };
  }

  const requestedSuit = readConsoleActiveSuit();
  const parties = loadConsoleHuntParties();
  let suitName = requestedSuit;
  let party = parties[suitName] || [];
  if (!party.length) {
    const fallback = Object.entries(parties).find(([, list]) => Array.isArray(list) && list.length);
    if (fallback) {
      suitName = fallback[0];
      party = fallback[1];
    }
  }
  const squadBlueprint = party.map(id => toBlueprint(id, suitName)).filter(Boolean);
  return {
    ready: squadBlueprint.length > 0,
    suitName,
    suitKey: suitName.toLowerCase(),
    squadBlueprint,
    requestedSuit
  };
}

function showGate(context) {
  const gate = document.getElementById("huntGate");
  if (!gate) return;
  gate.hidden = false;
  document.body?.classList.add("gate-active");
  const text = gate.querySelector(".gate__text");
  if (text && context?.requestedSuit) {
    text.textContent = `Add at least one card to your ${context.requestedSuit} Hunt team in the HUNT screen to enter Council Hunt.`;
  }
}

const huntContext = loadHuntContext();
const state = createGameState({
  suit: huntContext.suitKey,
  squadBlueprint: huntContext.squadBlueprint
});
pushLog(state, `Encounter: ${state.enemy.name}`);

const actions = {
  attack: () => playerAction("attack"),
  guard: () => playerAction("guard"),
  swap: () => playerAction("swap"),
  recruit: () => playerAction("recruit"),
  run: () => playerAction("run"),

  pickSwapIndex: (i) => {
    if (!state.inBattle) return;
    const ok = swapTo(state, i);
    if (ok) {
      state.message = `Swapped to ${state.squad[state.activeIndex].name}.`;
      pushLog(state, `Swap → ${state.squad[state.activeIndex].name}`);
      enemyTurn(); // swapping consumes your tempo
      ui.render();
    }
  },

  newEncounter: () => {
    resetEncounter(state);
    ui.render();
  },

  resetGame: () => {
    resetGame(state);
    ui.render();
  }
};

const ui = bindUI(state, actions);
ui.render();

function playerAction(type) {
  if (!state.inBattle) return;

  const p = getActiveFighter(state);
  const e = state.enemy;

  if (!p || p.hp <= 0) {
    state.message = "No active fighter. Swap to a living card.";
    ui.render();
    return;
  }

  if (type === "attack") {
    const dmg = computePlayerAttackDamage(p, e);
    applyDamage(e, dmg);
    state.message = `You hit for ${dmg}.`;
    pushLog(state, `Player Attack: ${p.name} → ${dmg}`);

    if (e.hp <= 0) {
      winByKO();
      ui.render();
      return;
    }

    enemyTurn();
    ui.render();
    return;
  }

  if (type === "guard") {
    state.guardActive = true;
    state.message = "Guard up. Reduced incoming damage.";
    pushLog(state, `Player Guard: ${p.name}`);
    enemyTurn();
    ui.render();
    return;
  }

  if (type === "swap") {
    state.message = "Click a squad card to swap (swap consumes tempo).";
    pushLog(state, "Swap ready.");
    ui.render();
    return;
  }

  if (type === "recruit") {
    const result = applyRecruitAttempt(state);

    if (result.ok) {
      state.message = `Recruit successful! (${pct(result.chance)} roll ${pct(result.roll)})`;
      pushLog(state, `Recruit SUCCESS: chance ${pct(result.chance)} roll ${pct(result.roll)}`);
      state.inBattle = false;
      ui.render();
      return;
    }

    state.message = `Recruit failed. (${result.reason ?? `chance ${pct(result.chance)} roll ${pct(result.roll)}`})`;
    pushLog(state, `Recruit FAIL: ${result.reason ?? `chance ${pct(result.chance)} roll ${pct(result.roll)}`}`);

    enemyTurn();
    ui.render();
    return;
  }

  if (type === "run") {
    state.message = "You withdrew. The target escapes.";
    pushLog(state, "Run: encounter ended.");
    state.inBattle = false;
    ui.render();
    return;
  }
}

function enemyTurn() {
  if (!state.inBattle) return;

  const p = getActiveFighter(state);
  const e = state.enemy;

  if (!p || p.hp <= 0) return;

  advanceTurn(state);

  const ai = decideEnemyAction(state);

  if (ai === "guard") {
    const boost = Math.floor(e.maxShield * 0.08);
    e.shield = Math.min(e.maxShield, e.shield + boost);
    state.message = `Enemy guards (+${boost} shield).`;
    pushLog(state, `Enemy Guard: +${boost} shield`);
    return;
  }

  let dmg = computeEnemyAttackDamage(e, state);

  if (state.guardActive) {
    dmg = Math.floor(dmg * guardMultiplier());
  }

  applyDamage(p, dmg);
  state.message = `Enemy hits for ${dmg}.`;
  pushLog(state, `Enemy Attack: ${e.name} → ${dmg}`);

  if (p.hp <= 0) {
    pushLog(state, `${p.name} defeated.`);
    state.message = `${p.name} is down. Next fighter steps in.`;
    autoSwapToNextLiving();
  }

  if (isSquadDefeated(state)) {
    state.inBattle = false;
    state.message = "Your squad is defeated. Encounter lost.";
    pushLog(state, "DEFEAT: squad wiped.");
  }
}

function autoSwapToNextLiving() {
  for (let i = 0; i < state.squad.length; i++) {
    if (state.squad[i].hp > 0) {
      state.activeIndex = i;
      pushLog(state, `Auto Swap → ${state.squad[state.activeIndex].name}`);
      return;
    }
  }
}

function winByKO() {
  state.inBattle = false;
  state.message = "Enemy knocked out. You can’t recruit a KO’d target (new encounter).";
  pushLog(state, "Enemy KO. (Recruit requires a live target under threshold.)");
}

function pct(x) {
  return `${Math.floor((x ?? 0) * 100)}%`;
}
