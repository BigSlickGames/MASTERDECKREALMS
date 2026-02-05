import { CONFIG } from "./config.js";
import { defaultSquad } from "./data/cards.js";
import { generateEnemy } from "./data/enemies.js";
import { makeRng } from "./systems/rng.js";

export function createGameState() {
  const rng = makeRng(Date.now());

  const state = {
    rng,
    turn: 1,
    suit: CONFIG.suit,
    squad: defaultSquad(CONFIG.suit),
    activeIndex: 0,
    enemy: generateEnemy({ suit: CONFIG.suit, rng }),
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
  const fresh = createGameState();
  Object.assign(state, fresh);
  pushLog(state, "Game reset.");
}

export function pushLog(state, text) {
  state.log.unshift({ t: Date.now(), text });
  if (state.log.length > 40) state.log.length = 40;
}
