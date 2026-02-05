import { CONFIG } from "./config.js";
import { buildCard, defaultSquad } from "./data/cards.js";
import { generateEnemy } from "./data/enemies.js";
import { makeRng } from "./systems/rng.js";

function defaultBlueprint(suit) {
  return defaultSquad(suit).map(card => ({
    suit: card.suit,
    rank: card.rank,
    name: card.name
  }));
}

function buildSquadFromBlueprint(blueprint, fallbackSuit) {
  if (!Array.isArray(blueprint) || blueprint.length === 0) {
    return defaultSquad(fallbackSuit);
  }
  const squad = [];
  blueprint.forEach(entry => {
    if (!entry || typeof entry !== "object") return;
    const suit = typeof entry.suit === "string" ? entry.suit : fallbackSuit;
    const rank = Number(entry.rank);
    if (!Number.isFinite(rank) || rank < 2 || rank > 14) return;
    const name = typeof entry.name === "string" ? entry.name : undefined;
    squad.push(buildCard({ suit, rank, name }));
  });
  return squad.length ? squad : defaultSquad(fallbackSuit);
}

export function createGameState(options = {}) {
  const rng = makeRng(Date.now());
  const seedSuit = options.suit || options.squadBlueprint?.[0]?.suit || CONFIG.suit;
  const blueprint = Array.isArray(options.squadBlueprint) && options.squadBlueprint.length
    ? options.squadBlueprint
    : defaultBlueprint(seedSuit);

  const state = {
    rng,
    turn: 1,
    suit: seedSuit,
    squad: buildSquadFromBlueprint(blueprint, seedSuit),
    squadBlueprint: blueprint.map(entry => ({
      suit: entry.suit,
      rank: entry.rank,
      name: entry.name
    })),
    activeIndex: 0,
    enemy: generateEnemy({ suit: seedSuit, rng }),
    inBattle: true,
    guardActive: false,
    enemyMomentum: 0, // increases each turn
    message: "Select an action.",
    log: [],
  };

  return state;
}

export function resetEncounter(state) {
  state.turn = 1;
  state.enemyMomentum = 0;
  state.guardActive = false;
  state.inBattle = true;
  state.enemy = generateEnemy({ suit: state.suit, rng: state.rng });
  state.message = "A new recruit target appears.";
  state.log.length = 0;
  pushLog(state, `Encounter: ${state.enemy.name}`);
}

export function resetGame(state) {
  const fresh = createGameState({
    suit: state.suit,
    squadBlueprint: state.squadBlueprint
  });
  Object.assign(state, fresh);
  pushLog(state, "Game reset.");
}

export function pushLog(state, text) {
  state.log.unshift({ t: Date.now(), text });
  if (state.log.length > 40) state.log.length = 40;
}
