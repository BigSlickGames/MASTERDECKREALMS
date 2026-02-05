import { buildHud, updateHud } from "./hud.js";
import { renderRoster } from "./roster.js";
import { renderLog } from "./log.js";
import { rankLabel, titleCase } from "../utils/format.js";
import { recruitInfo, computeRecruitChance } from "../systems/recruit.js";
import { getActiveFighter, canSwap, getEnemyHpRatio } from "../systems/battle.js";
import { CONFIG } from "../config.js";

export function bindUI(state, actions) {
  const els = {
    playerHud: document.getElementById("playerHud"),
    enemyHud: document.getElementById("enemyHud"),
    roster: document.getElementById("roster"),
    log: document.getElementById("combatLog"),

    playerRank: document.getElementById("playerRank"),
    playerName: document.getElementById("playerName"),
    playerMeta: document.getElementById("playerMeta"),

    enemyRank: document.getElementById("enemyRank"),
    enemyName: document.getElementById("enemyName"),
    enemyMeta: document.getElementById("enemyMeta"),

    turnLabel: document.getElementById("turnLabel"),
    statusLabel: document.getElementById("statusLabel"),

    btnAttack: document.getElementById("btnAttack"),
    btnGuard: document.getElementById("btnGuard"),
    btnSwap: document.getElementById("btnSwap"),
    btnRecruit: document.getElementById("btnRecruit"),
    btnRun: document.getElementById("btnRun"),

    btnNewEncounter: document.getElementById("btnNewEncounter"),
    btnReset: document.getElementById("btnReset"),
  };

  buildHud(els.playerHud);
  buildHud(els.enemyHud);

  els.btnAttack.addEventListener("click", actions.attack);
  els.btnGuard.addEventListener("click", actions.guard);
  els.btnSwap.addEventListener("click", actions.swap);
  els.btnRecruit.addEventListener("click", actions.recruit);
  els.btnRun.addEventListener("click", actions.run);

  els.btnNewEncounter.addEventListener("click", actions.newEncounter);
  els.btnReset.addEventListener("click", actions.resetGame);

  function render() {
    const p = getActiveFighter(state);
    const e = state.enemy;

    els.turnLabel.textContent = `Turn: ${state.turn}`;
    els.statusLabel.textContent = state.message;

    // Card panels
    els.playerRank.textContent = p ? rankLabel(p.rank) : "—";
    els.playerName.textContent = p ? p.name : "No Fighter";
    els.playerMeta.textContent = p ? `${titleCase(p.suit)} • ${p.role}` : "—";

    els.enemyRank.textContent = e ? rankLabel(e.rank) : "—";
    els.enemyName.textContent = e ? e.name : "No Enemy";
    els.enemyMeta.textContent = e ? `${titleCase(e.suit)} • Resistance ${Math.floor((e.resistance ?? 0)*100)}%` : "—";

    // Recruit meter: show chance but only pulse when eligible
    const info = recruitInfo(e);
    const chance = computeRecruitChance(e);
    const recruitBar = info.canAttempt ? chance :
      Math.max(0, Math.min(1, (CONFIG.recruit.hpThresholdRatio - getEnemyHpRatio(e)) * -1));

    updateHud(els.playerHud, {
      hp: p?.hp ?? 0,
      maxHp: p?.maxHp ?? 1,
      shield: p?.shield ?? 0,
      maxShield: p?.maxShield ?? 1,
      recruitPct: 0,
      recruitPulse: false
    });

    updateHud(els.enemyHud, {
      hp: e.hp,
      maxHp: e.maxHp,
      shield: e.shield,
      maxShield: e.maxShield,
      recruitPct: recruitBar,
      recruitPulse: info.canAttempt
    });

    // Roster
    renderRoster(els.roster, state, actions.pickSwapIndex);

    // Buttons
    els.btnAttack.disabled = !state.inBattle;
    els.btnGuard.disabled = !state.inBattle;
    els.btnSwap.disabled = !state.inBattle || !canSwap(state);
    els.btnRun.disabled = !state.inBattle;

    els.btnRecruit.disabled = !state.inBattle || !info.canAttempt;

    // Log
    renderLog(els.log, state.log);
  }

  return { render };
}
