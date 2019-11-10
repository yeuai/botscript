import { evalSync } from 'jexl';
import { Struct, Request } from '../engine';
import { Logger } from './logger';

const logger = new Logger('Utils');

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

/**
 * Safe eval expression
 * @param code str
 * @param context variables
 */
export function evaluate(code: string, context: any, botid = 'BotScript') {
  const keys = Object.keys(context || {});
  const vars = Object.assign({}, ...keys.map(x => ({
    [`$${x}`]: context[x],
  })));

  try {
    return evalSync(code, vars);
  } catch (err) {
    logger.warn('Error while eval expression', { botid, msg: (err && err.message) });
    return undefined;
  }

}
