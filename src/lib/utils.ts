import axios from 'axios';
import { evalSync } from 'jexl';
import { Struct, Request } from '../common';
import { TestConditionalCallback, Types } from '../interfaces/types';
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
 * Test conditional flow
 * @param dialogue
 * @param variables
 */
export function testConditionalFlow(dialogue: Struct, req: Request, callback: TestConditionalCallback) {
  return testConditionalType(Types.ConditionalFlow, dialogue, req, callback);
}

/**
 * Test conditional reply
 * @param dialogue
 * @param req
 * @param callback
 */
export function testConditionalReply(dialogue: Struct, req: Request, callback: TestConditionalCallback) {
  return testConditionalType(Types.ConditionalReply, dialogue, req, callback);
}

/**
 * Test conditional dialogues given type
 * @param type
 * @param dialogue
 * @param req
 * @param callback stop if callback returns true
 */
export function testConditionalType(type: Types, dialogue: Struct, req: Request, callback: TestConditionalCallback) {
  if (!dialogue) {
    logger.info('No dialogue for test:', type);
    return false;
  }

  const separator = new RegExp(`\\${type}>`);
  const conditions = (dialogue.conditions || []).filter(x => separator.test(x));
  return conditions.some(cond => {
    const tokens = cond.split(separator).map(x => x.trim());
    if (tokens.length === 2) {
      const expr = tokens[0];
      const value = tokens[1];
      logger.debug(`Test conditional type: ${type}, botid=${req.botId}, expr=${expr}`);

      if (evaluate(expr, req.variables)) {
        return callback(value, req);
      }
    }
  });
}

/**
 * Safe eval expression
 * @param code str
 * @param context variables
 */
export function evaluate(code: string, context: any) {
  const keys = Object.keys(context || {});
  const vars = Object.assign({}, ...keys.map(x => ({
    [x.startsWith('$') ? x : `$${x}`]: context[x],
  })));

  try {
    logger.debug('Evaluate:', code);
    return evalSync(code, vars);
  } catch (err) {
    logger.warn('Error while eval expression', { msg: (err && err.message) });
    return undefined;
  }

}

/**
 * Call http service
 * @param command
 * @param req
 */
export function callHttpService(command: Struct, req: Request) {
  const vIsGetMethod = /^get$/i.test(command.options[0]);
  const headers = command.body.map(x => x.split(':'));
  const method = vIsGetMethod ? 'GET' : 'POST';
  const url = command.options[1];
  const body = vIsGetMethod ? undefined : req.variables;

  logger.info('Send request:', method, url, body);

  return axios
    .request({ url, headers, method, data: body })
    .then(res => res.data)
    .catch(err => {
      logger.error('Can not send request:', url, method, body, headers, err);
      return Promise.reject(err);
    });
}

/**
 * Download botscript data.
 * @param url
 */
export async function downloadScripts(url: string): Promise<string[]> {
  logger.info('Starting download', url);
  // download data file.
  const vResult = await axios.get(url);
  // test data content type.
  const vContentType = vResult.headers['content-type'];
  if (/^text\/plain/.test(vContentType as string)) {
    const vTextData = await vResult.data;
    return [vTextData];
  } else if (/^application\/json/.test(vContentType as string)) {
    const vListData = await vResult.data; // require array response.
    return vListData;
  } else {
    throw new Error('Data format unsupported!');
  }
}
