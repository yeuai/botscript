/**
 * Get random candidate
 * @param candidates array
 */
export function random<T>(candidates: T[]) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * send http get action
 * @param options
 */
export async function httpGet(options: string[]) {

}

/**
 * send http post action
 * @param options
 * @param data
 */
export async function httpPost(options: string[], data: any) {

}
