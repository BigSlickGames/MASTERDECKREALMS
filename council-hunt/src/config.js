export const CONFIG = {
  suit: "hearts", // change to clubs/spades/diamonds later
  recruit: {
    hpThresholdRatio: 0.30,          // must drop enemy HP under 30%
    baseChanceLow: 0.45,             // ranks 2-5
    baseChanceMid: 0.30,             // ranks 6-10
    baseChanceHigh: 0.20,            // J-Q-K
    baseChanceAce: 0.12,             // Ace
    failResistanceBump: 0.10,         // +10% resistance per failed attempt
    maxChance: 0.85,
    minChance: 0.02,
  },
  battle: {
    guardDamageMultiplier: 0.55,
    swapCostsTurn: true,
    momentumPerTurn: 0.05,           // enemy gets stronger each turn (mini-game pacing)
    maxTurnsBeforeEscalation: 8,
  }
};
