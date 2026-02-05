(() => {
  const frame = document.getElementById("huntGameFrame");
  if (!frame) return;

  frame.addEventListener("load", () => {
    frame.contentWindow?.focus?.();
  });

})();
