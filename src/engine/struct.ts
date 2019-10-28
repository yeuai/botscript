import { Machine } from 'xstate';
import XRegExp from 'xregexp';

export const TYPES: any = ({
  '!': 'definition',
  '+': 'dialogue',
  '-': 'response',
  '@': 'command',
  '?': 'question',
  '~': 'dialogflow',
  '#': 'comment',
});

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

/**
 * Script data structure
 */
export class Struct {
  type: string;
  content: string;
  name: string;
  value?: any;
  options: string[];

  constructor(content: string) {
    this.content = content;
    this.type = getScriptType(content);
    this.name = this.type;
    this.options = [];
  }

  /**
   * Parse data to script structure
   * @param data
   */
  static parse(data: string) {
    return new Struct(data);
  }
}
