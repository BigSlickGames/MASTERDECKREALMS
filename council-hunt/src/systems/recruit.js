import { CONFIG } from "../config.js";
import { clamp } from "../utils/clamp.js";
import { getEnemyHpRatio } from "./battle.js";

export function recruitInfo(enemy) {
  const hpOk = getEnemyHpRatio(enemy) <= CONFIG.recruit.hpThresholdRatio;
  const shieldOk = enemy.shield <= 0;
  return { hpOk, shieldOk, canAttempt: hpOk && shieldOk && enemy.hp > 0 };
}

export function computeRecruitChance(enemy) {
  // base by rank
  const r = enemy.rank;
  let base =
    r <= 5 ? CONFIG.recruit.baseChanceLow :
    r <= 10 ? CONFIG.recruit.baseChanceMid :
    r <= 13 ? CONFIG.recruit.baseChanceHigh :
    CONFIG.recruit.baseChanceAce;

  // resistance reduces chance
  const resist = enemy.resistance ?? 0;
  let chance = base * (1 - resist);

  // failed attempts harden the target
  chance *= (1 - (enemy.failedRecruitAttempts ?? 0) * 0.08);

  return clamp(chance, CONFIG.recruit.minChance, CONFIG.recruit.maxChance);
}

export function applyRecruitAttempt(state) {
  const enemy = state.enemy;
  const info = recruitInfo(enemy);
  if (!info.canAttempt) {
    return { ok:false, reason:"Recruit not available yet." };
  }

  const chance = computeRecruitChance(enemy);
  const roll = state.rng();
  const success = roll < chance;

  if (success) return { ok:true, chance, roll };

  // fail: increase resistance so spam is punished
  enemy.failedRecruitAttempts = (enemy.failedRecruitAttempts ?? 0) + 1;
  enemy.resistance = clamp((enemy.resistance ?? 0) + CONFIG.recruit.failResistanceBump, 0, 0.85);

  return { ok:false, chance, roll };
}
