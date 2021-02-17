import { Request, Context, Struct } from '../engine';

/**
> nlu

+ intent: greeting
- Hallo!
*/
export function DefaultNLU(req: Request, ctx: Context) {
  const vNluDirective = ctx.directives.get('nlu') as Struct;
  // TODO: get intent/entities from vNluDirective API Server.
  req.intent = '__UNKNOW__';
  req.entities = [{name: 'LOC', value: 'Hanoi'}]

  if (req.message === 'tôi là ai') {
    req.intent = 'who';
  }
}
