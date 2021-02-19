// tslint:disable: jsdoc-format
import { Request, Context } from '../common';

/**
> addTimeNow

+ what time is it
- it is $time
*/
export function addTimeNow(req: Request, ctx: Context) {
  const now = new Date();
  req.variables.time = `${now.getHours()}:${now.getMinutes()}`;
}
