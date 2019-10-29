export function random(candidates: any[]) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}
