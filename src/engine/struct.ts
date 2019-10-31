import { Machine } from 'xstate';

export const TYPES: any = ({
  '!': 'definition',
  '+': 'dialogue',
  '-': 'response',
  '@': 'command',
  '?': 'question',
  '~': 'flows',
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
 * Get body declartion without remove tokens
 * @param script
 */
function getScriptBody(script: string): string[] {
  const type = script.charAt(0);
  return script.trim().split('\n').filter(x => !x.startsWith(type));
}

/**
 * Get head declartion
 * @param script
 */
function getScriptHead(script: string): string[] {
  const type = script.charAt(0);
  return script.trim().split('\n').filter(x => x.startsWith(type)).map(x => x.substring(1).trim());
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
  head: string[];
  body: string[];
  flows: string[];
  replies: string[];
  options: string[];
  value?: any;

  /**
   * Init script struct and parse components
   * @param content
   */
  constructor(content: string) {
    this.type = getScriptType(content);
    this.head = getScriptHead(content);
    this.body = getScriptBody(content);

    // extract default name
    this.content = content;
    this.name = this.head.find(() => true) || '';
    this.flows = [];
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
      case TYPES['!']:  // definition
        if (struct.body.length === 0) {
          const tokens = struct.head[0].split(' ');
          struct.value = tokens.pop() || '';
          struct.name = tokens.pop() || '';
          struct.options = [struct.value];
        } else {
          struct.options = struct.body.map(x => x.replace(/^\s*-\s*/, ''));
          if (struct.options.length > 1) {
            struct.value = struct.options;
          } else {
            struct.value = struct.options.find(x => true);
          }
        }
        break;
      case TYPES['+']: // dialogue
        struct.flows = struct.body.filter(x => x.startsWith('~')).map(x => x.replace(/^\s*~\s*/, ''));
        struct.replies = struct.body.filter(x => x.startsWith('-')).map(x => x.replace(/^\s*-\s*/, ''));
        break;
      case TYPES['~']: // flows
        struct.flows = struct.body.filter(x => x.startsWith('~')).map(x => x.replace(/^\s*~\s*/, ''));
        struct.replies = struct.body.filter(x => x.startsWith('-')).map(x => x.replace(/^\s*-\s*/, ''));
        break;
      case TYPES['@']:  // command
        struct.value = struct.name;
        break;
      case TYPES['?']:  // question
        struct.options = struct.body.map(x => x.replace(/^\s*-\s*/, ''));
        break;

    }
    return struct;
  }

  toString() {
    return `${this.type}: ${this.options.join(',')}`;
  }

}
