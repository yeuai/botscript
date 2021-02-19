// tslint:disable: jsdoc-format
import { Request, Context, Struct } from '../engine';
import { callHttpService } from '../lib/utils';
import { Logger } from '../lib/logger';

const logger = new Logger('NLU');
const defaultCommandNlu = Struct.parse(`@ nlu https://botscript.ai/api/nlu`);
const defaultDirectiveNlu = Struct.parse(`/nlu: nlu`);

/**
> nlu

+ intent: greeting
- Hallo!
*/
export async function nlu(req: Request, ctx: Context) {
  // Get nlu command from directive
  const vDirectiveNlu = ctx.directives.get('nlu') as Struct || defaultDirectiveNlu;
  const vCommandNlu = (ctx.commands.get(vDirectiveNlu.value) as Struct) || defaultCommandNlu;
  logger.info(`Send nlu request: (${vDirectiveNlu.value})`, req.message);

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
