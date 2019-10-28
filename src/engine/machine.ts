import { Machine } from 'xstate';
import XRegExp from 'xregexp';

const TYPES: any = {
  '!': 'definition',
  '+': 'dialogue',
  '-': 'response',
  '@': 'command',
  '?': 'question',
  '~': 'dialogflow',
  '#': 'comment',
};

/**
 * Get type declaration
 * @param script
 */
function getScriptType(script: string) {
  return TYPES[script.charAt(0)];
}

// export function createStateMachine() {
//   return Machine({

//   });
// }

export {
  TYPES,
};
