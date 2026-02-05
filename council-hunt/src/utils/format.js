export function titleCase(s) {
  return (s || "").replace(/\b\w/g, c => c.toUpperCase());
}

export function rankLabel(rank) {
  const map = { 11:"J", 12:"Q", 13:"K", 14:"A" };
  return map[rank] ?? String(rank);
}
