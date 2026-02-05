export function renderLog(el, lines) {
  el.innerHTML = "";
  for (const l of lines) {
    const div = document.createElement("div");
    div.className = "log__line";
    div.textContent = l.text;
    el.appendChild(div);
  }
}
