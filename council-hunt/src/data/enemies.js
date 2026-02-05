import { buildCard } from "./cards.js";

export function generateEnemy({ suit, rng }) {
  // Weighted toward higher ranks so recruiting feels like a hunt
  const roll = rng();
  let rank;
  if (roll < 0.35) rank = 9 + Math.floor(rng() * 3);       // 9-11
  else if (roll < 0.70) rank = 11 + Math.floor(rng() * 3); // J-Q-K
  else if (roll < 0.86) rank = 6 + Math.floor(rng() * 3);  // 6-8
  else rank = 14;                                          // Ace

  const enemy = buildCard({ suit, rank, name: enemyName(suit, rank) });

  // Make enemies tougher than a normal squad member (they're “higher rank & hard to recruit”)
  enemy.maxHp = Math.floor(enemy.maxHp * 1.25);
  enemy.hp = enemy.maxHp;
  enemy.maxShield = Math.floor(enemy.maxShield * 1.35);
  enemy.shield = enemy.maxShield;
  enemy.atk = Math.floor(enemy.atk * 1.10);

  // Recruit resistance baseline
  enemy.resistance = baseResistance(rank); // 0..1
  enemy.failedRecruitAttempts = 0;

  return enemy;
}

function baseResistance(rank) {
  if (rank <= 5) return 0.10;
  if (rank <= 10) return 0.25;
  if (rank <= 13) return 0.40;
  return 0.52; // Ace
}

function enemyName(suit, rank) {
  const title =
    rank <= 5 ? "Scout" :
    rank <= 10 ? "Vanguard" :
    rank <= 13 ? "Royal" :
    "Apex";

  const rankName = rank === 11 ? "Jack" : rank === 12 ? "Queen" : rank === 13 ? "King" : rank === 14 ? "Ace" : String(rank);
  return `${title} ${rankName} (${suit})`;
}
