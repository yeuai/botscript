export function random<T>(candidates: T[]) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}
