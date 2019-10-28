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

/**
 * Get body declartion
 * @param script
 */
function getScriptBody(script: string) {
  return script.replace(/^\s*[+~\-@?!`].*\n+/, '');
}

/**
 * Get head declartion
 * @param script
 */
function getScriptHead(script: string): string {
  return script.trim().split('\n').find(() => true) || '';
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
  head: string;
  body: string;
  value?: any;
  options: string[];

  constructor(content: string) {
    this.content = content;
    this.type = getScriptType(content);
    this.head = getScriptHead(content);
    this.body = getScriptBody(content);
    this.name = this.head.substring(1).trim();
    this.options = [];
  }

  /**
   * Parse data to script structure
   * @param data
   */
  static parse(data: string) {
    const struct = new Struct(data);

    // valuable data struct
    switch (struct.type) {
      case TYPES['!']:
        if (struct.body.startsWith('!')) {
          const tokens = struct.body.split(' ');
          struct.value = tokens.pop() || '';
          struct.name = tokens.pop() || '';
          struct.options = [struct.value];
          console.log('Test body: ' + struct.body);
        } else {
          const tokens = struct.body.split(/^\s*-\s*/m);
          if (tokens.length > 1) {
            struct.options = tokens.map(s => s.trim());
            struct.value = struct.options;
          } else {
            struct.options = struct.content.replace(/^!+\s*/m, '').split(' ').splice(0, 1);
            struct.value = struct.options.find(x => true);
          }
        }
        break;
      case TYPES['@']:  // command
        struct.value = struct.name;
        break;
      case TYPES['?']:
        struct.options = struct.content
          .replace(/^\?.+$\n\s*-/m, '')
          .split(/^\s*-\s*/m).map(s => s.trim());
        break;

    }
    return struct;
  }

  toString() {
    return `${this.type}: ${this.options.join(',')}`;
  }
}
