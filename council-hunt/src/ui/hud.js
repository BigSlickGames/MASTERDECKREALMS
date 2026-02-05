import { clamp } from "../utils/clamp.js";

function barTemplate(labelLeft, labelRight, fillClass = "") {
  return `
    <div class="bar">
      <div class="bar__label">
        <span>${labelLeft}</span>
        <span>${labelRight}</span>
      </div>
      <div class="bar__track">
        <div class="bar__fill ${fillClass}"></div>
      </div>
    </div>
  `;
}

export function buildHud(el) {
  el.innerHTML = `
    ${barTemplate("HP", "0/0", "")}
    ${barTemplate("SHIELD", "0/0", "bar__fill--shield")}
    ${barTemplate("RECRUIT", "0%", "bar__fill--recruit")}
  `;
}

export function updateHud(el, { hp, maxHp, shield, maxShield, recruitPct, recruitPulse=false }) {
  const bars = el.querySelectorAll(".bar");
  const hpBar = bars[0];
  const shBar = bars[1];
  const rcBar = bars[2];

  const hpFill = hpBar.querySelector(".bar__fill");
  const shFill = shBar.querySelector(".bar__fill");
  const rcFill = rcBar.querySelector(".bar__fill");

  const hpPct = maxHp ? clamp(hp / maxHp, 0, 1) : 0;
  const shPct = maxShield ? clamp(shield / maxShield, 0, 1) : 0;

  hpFill.style.width = `${Math.floor(hpPct * 100)}%`;
  shFill.style.width = `${Math.floor(shPct * 100)}%`;
  rcFill.style.width = `${Math.floor(clamp(recruitPct, 0, 1) * 100)}%`;

  hpBar.querySelector(".bar__label span:last-child").textContent = `${hp}/${maxHp}`;
  shBar.querySelector(".bar__label span:last-child").textContent = `${shield}/${maxShield}`;
  rcBar.querySelector(".bar__label span:last-child").textContent = `${Math.floor(recruitPct * 100)}%`;

  // pulse track when recruit is possible
  const track = rcBar.querySelector(".bar__track");
  track.classList.toggle("pulse", recruitPulse);
}
