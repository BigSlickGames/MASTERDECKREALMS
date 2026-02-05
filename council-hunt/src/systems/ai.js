// Simple enemy AI: mostly attack; occasionally guard if shield is low.
export function decideEnemyAction(state) {
  const e = state.enemy;
  const shieldRatio = e.maxShield ? (e.shield / e.maxShield) : 0;

  if (shieldRatio < 0.15 && e.hp > 0 && Math.random() < 0.20) return "guard";
  return "attack";
}
