// tslint:disable: jsdoc-format
import { Request } from '../engine';

/**
 * noReplyHandle
 */
export function noReplyHandle() {
  const postProcessing = (res: Request) => {
    if (res.speechResponse === 'NO REPLY!') {
      res.speechResponse = `Sorry! I don't understand!`;
    }
  };

  return postProcessing;
}
