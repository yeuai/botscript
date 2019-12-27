// tslint:disable: jsdoc-format
import { Request, Context, Struct } from '../engine';
import * as utils from '../lib/utils';

/**
 * noReplyHandle
 * - if dialog is in the flow then repeat reply from last time
 */
export function noReplyHandle() {
  const postProcessing = (res: Request, ctx: Context) => {
    if (res.speechResponse === 'NO REPLY!') {
      if (ctx.flows.has(res.currentFlow)) {
        const dialog = ctx.flows.get(res.currentFlow) as Struct;
        const replyCandidate = utils.random(dialog.replies);
        res.speechResponse = replyCandidate;
      } else {
        res.speechResponse = `Sorry! I don't understand!`;
      }
    }
  };

  return postProcessing;
}
