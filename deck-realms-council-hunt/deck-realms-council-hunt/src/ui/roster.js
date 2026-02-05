import { clamp } from "../utils/clamp.js";
import { rankLabel } from "../utils/format.js";

export function renderRoster(el, state, onPick) {
  el.innerHTML = "";

  state.squad.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "rosterCard" + (i === state.activeIndex ? " active" : "");
    card.title = c.hp <= 0 ? "Defeated" : "Click to swap";

    const hpPct = c.maxHp ? clamp(c.hp / c.maxHp, 0, 1) : 0;

    card.innerHTML = `
      <div class="rosterCard__top">
        <div>
          <div class="rosterCard__rank">${rankLabel(c.rank)}</div>
          <div class="rosterCard__name">${c.name}</div>
        </div>
        <div class="rosterCard__name">${c.role}</div>
      </div>
      <div class="rosterCard__hp">
        <div class="bar__track" style="height:10px;">
          <div class="bar__fill" style="width:${Math.floor(hpPct*100)}%;"></div>
        </div>
        <div style="margin-top:6px; font-size:11px; color:rgba(255,255,255,.55);">
          HP ${c.hp}/${c.maxHp}
        </div>
      </div>
    `;

    card.addEventListener("click", () => onPick(i));
    el.appendChild(card);
  });
}
