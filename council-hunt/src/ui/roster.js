import { rankLabel } from "../utils/format.js";

export function renderRoster(el, state, onPick) {
  el.innerHTML = "";

  const total = state.squad.length;
  state.squad.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "rosterCard" + (i === state.activeIndex ? " active" : "");
    card.title = c.hp <= 0 ? "Defeated" : "Click to swap";
    card.style.zIndex = String(i + 1);
    if (i === state.activeIndex) {
      card.style.zIndex = String(total + 5);
    }

    card.innerHTML = `
      <div class="card3d card3d--roster">
        <div class="card3d__frame"></div>
        <div class="card3d__content">
          <div class="card3d__rank">${rankLabel(c.rank)}</div>
          <div class="card3d__name">${c.name}</div>
          <div class="card3d__meta">${c.role}</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => onPick(i));
    el.appendChild(card);
  });
}
