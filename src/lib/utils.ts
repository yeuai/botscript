import { Struct, Request } from '../engine';

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

/**
 * Test & add conditional flow
 * @param dialogue
 * @param variables
 */
export function testAddConditionalFlow(dialogue: Struct, req: Request) {
  const conditions = dialogue.conditions.filter(x => /~>/.test(x));
  for (const cond of conditions) {
    const tokens = cond.split('~>').map(x => x.trim());
    if (tokens[0] === 'true') { // TODO: Test `cond`
      const flow = tokens[1];
      if (req.resolvedFlows.indexOf(flow) < 0 && req.missingFlows.indexOf(flow) < 0) {
        req.missingFlows.push(flow);
      }
    }
  }
  return false;
}
