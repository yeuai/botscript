import { evalSync } from 'jexl';
import { Struct, Request } from '../engine';
import { TestConditionalCallback } from '../interfaces/types';
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
 * Test conditional flow
 * @param dialogue
 * @param variables
 */
export function testConditionalFlow(dialogue: Struct, req: Request, callback: TestConditionalCallback) {
  const conditions = dialogue.conditions.filter(x => /~>/.test(x));
  for (const cond of conditions) {
    const tokens = cond.split('~>').map(x => x.trim());
    if (tokens.length === 2) {
      const expr = tokens[0];
      const flow = tokens[1];
      if (evaluate(expr, req.variables, req.botId)) {
        callback(flow, req);
      }
    }
  }
}

/**
 * Safe eval expression
 * @param code str
 * @param context variables
 */
export function evaluate(code: string, context: any, botid = 'BotScript') {
  const keys = Object.keys(context || {});
  const vars = Object.assign({}, ...keys.map(x => ({
    [x.startsWith('$') ? x : `$${x}`]: context[x],
  })));

  try {
    logger.debug(`Bot: ${botid}, Eval: ${code}`);
    return evalSync(code, vars);
  } catch (err) {
    logger.warn('Error while eval expression', { botid, msg: (err && err.message) });
    return undefined;
  }

}
