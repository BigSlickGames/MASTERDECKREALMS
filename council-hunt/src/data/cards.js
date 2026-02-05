/* ==========================================================
   BEGINNER GUIDE: PLAYER CARDS (EDIT HERE)
   This file defines the 5 player cards shown in the roster.
   Edit defaultSquad() below to set your 5 cards manually.

   You can change:
   - suit: "hearts" | "spades" | "diamonds" | "clubs"
   - rank: 2-14  (11=J, 12=Q, 13=K, 14=A)
   - name: any display name you want

   If you change buildCard() formulas, it changes stats for ALL cards.
   ========================================================== */

// Minimal stats derived from rank. Replace with real stats if needed.
export function buildCard({ suit, rank, name }) {
  const isFace = rank >= 11 && rank <= 13;
  const isAce = rank === 14;

  const hpBase = 55 + rank * 6 + (isFace ? 18 : 0) + (isAce ? 28 : 0);
  const shieldBase = 18 + Math.floor(rank * 2.2) + (isFace ? 12 : 0) + (isAce ? 18 : 0);
  const atkBase = 10 + Math.floor(rank * 1.7) + (isFace ? 6 : 0) + (isAce ? 10 : 0);
  const speed = 8 + Math.floor(rank * 0.6); // affects initiative later (not used heavily yet)

  // Simple role tag to make squads interesting without poker-hands.
  const role =
    rank <= 5 ? "stabilizer" :
    rank <= 9 ? "striker" :
    isAce ? "alpha" :
    "breaker";

  return {
    id: `${suit}-${rank}-${Math.random().toString(16).slice(2)}`,
    suit,
    rank,
    name: name ?? `${rank} of ${suit}`,
    role,
    maxHp: hpBase,
    hp: hpBase,
    maxShield: shieldBase,
    shield: shieldBase,
    atk: atkBase,
    speed,
    // future hooks
    passives: [],
  };
}

export function defaultSquad(suit = "hearts") {
  // EDIT THESE 5 LINES to set your player cards (manual roster).
  return [
    buildCard({ suit, rank: 6,  name: "Vanguard" }),
    buildCard({ suit, rank: 8,  name: "Striker" }),
    buildCard({ suit, rank: 10, name: "Breaker" }),
    buildCard({ suit, rank: 12, name: "Royal Guard" }),
    buildCard({ suit, rank: 13, name: "Council Blade" }),
  ];
}
