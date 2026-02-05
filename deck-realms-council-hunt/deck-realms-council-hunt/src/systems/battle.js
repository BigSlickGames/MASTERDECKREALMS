import { CONFIG } from "../config.js";
import { clamp } from "../utils/clamp.js";

export function getActiveFighter(state) {
  return state.squad[state.activeIndex] ?? null;
}

export function isSquadDefeated(state) {
  return state.squad.every(c => c.hp <= 0);
}

export function advanceTurn(state) {
  state.turn += 1;
  state.guardActive = false;

  // Momentum ramps enemy power to keep mini-game short
  state.enemyMomentum = clamp(state.enemyMomentum + CONFIG.battle.momentumPerTurn, 0, 0.60);
}

export function applyDamage(target, dmg) {
  let remaining = dmg;

  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }

  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining);
  }

  return { shield: target.shield, hp: target.hp };
}

export function computePlayerAttackDamage(attacker, enemy) {
  // Simple: attacker atk plus role tweak
  const roleBonus =
    attacker.role === "breaker" ? 1.08 :
    attacker.role === "striker" ? 1.12 :
    attacker.role === "alpha" ? 1.18 :
    1.00;

  return Math.max(6, Math.floor(attacker.atk * roleBonus));
}

export function computeEnemyAttackDamage(enemy, state) {
  const momentum = 1 + state.enemyMomentum;
  return Math.max(7, Math.floor(enemy.atk * momentum));
}

export function guardMultiplier() {
  return CONFIG.battle.guardDamageMultiplier;
}

export function canSwap(state) {
  return state.squad.some((c, i) => i !== state.activeIndex && c.hp > 0);
}

export function swapTo(state, index) {
  if (index < 0 || index >= state.squad.length) return false;
  if (state.squad[index].hp <= 0) return false;
  state.activeIndex = index;
  return true;
}

export function getEnemyHpRatio(enemy) {
  return enemy.hp / enemy.maxHp;
}
