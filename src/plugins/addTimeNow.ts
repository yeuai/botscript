// tslint:disable: jsdoc-format
import { Request, Context } from '../engine';

/**
> addTimeNow

+ what time is it
- it is $time
*/
export function addTimeNow(req: Request, ctx: Context) {
  const now = new Date();
  req.variables.time = `${now.getHours()}:${now.getMinutes()}`;
}
