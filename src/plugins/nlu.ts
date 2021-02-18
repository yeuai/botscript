// tslint:disable: jsdoc-format
import { Request, Context, Struct } from '../engine';
import { callHttpService } from '../lib/utils';
import { Logger } from '../lib/logger';

const logger = new Logger('NLU');
const defaultNLU = Struct.parse(`@ nlu https://botscript.ai/api/nlu`);

/**
> nlu

+ intent: greeting
- Hallo!
*/
export async function nlu(req: Request, ctx: Context) {
  // const vDirectiveNlu = ctx.directives.get('nlu') as Struct;
  // TODO: get nlu command from directive
  const vCommandNlu = (ctx.commands.get('nlu') as Struct) || defaultNLU;
  logger.info('Send nlu request:', vCommandNlu.value, req.message);

  try {

    // Extract intent/entities from vNluDirective API Server.
    const { intent = '__UNKNOW__', entities = [] } = await callHttpService(vCommandNlu, req);

    // attach result to request message.
    req.intent = intent;
    req.entities = entities;

  } catch (error) {
    logger.error('Cannot extract nlu message!', error);
  }
}
