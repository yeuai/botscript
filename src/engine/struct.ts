/**
 * Struct types
 */
export const TYPES: any = ({
  '!': 'definition',
  '+': 'dialogue',
  '-': 'response',
  '@': 'command',
  '?': 'question',
  '~': 'flows',
  '#': 'comment',
  '*': 'condition',
  '>': 'plugin',
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
  return script.split('\n').map(x => x.trim()).filter(x => !x.startsWith(type));
}

/**
 * Get head declartion
 * @param script
 */
function getScriptHead(script: string): string[] {
  const type = script.charAt(0);
  return script.split('\n')
    .map(x => x.trim())
    // get all types declaration
    .filter(x => x.startsWith(type))
    .map(x => x.substring(1).trim());
}

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
  triggers: string[];
  conditions: string[];
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
    this.replies = [];
    this.triggers = [];
    this.conditions = [];
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
          // tslint:disable-next-line: no-shadowed-variable
          const tokens = struct.head[0].split(' ');
          struct.value = tokens.pop() || '';
          struct.name = tokens.pop() || '';
          struct.options = [struct.value];
        } else {
          struct.options = struct.body.map(x => x.replace(/^-\s*/, ''));
          if (struct.options.length > 1) {
            struct.value = struct.options;
          } else {
            struct.value = struct.options.find(x => true);
          }
        }
        break;
      case TYPES['+']: // dialogue
        struct.triggers = struct.head;
        struct.replies = struct.body.filter(x => x.startsWith('-')).map(x => x.replace(/^-\s*/, ''));
        struct.flows = struct.body.filter(x => x.startsWith('~')).map(x => x.replace(/^~\s*/, ''));
        struct.conditions = struct.body.filter(x => x.startsWith('*')).map(x => x.replace(/^\*\s*/, ''));
        break;
      case TYPES['~']: // flows
        struct.triggers = struct.body.filter(x => x.startsWith('+')).map(x => x.replace(/^\+\s*/, ''));
        struct.replies = struct.body.filter(x => x.startsWith('-')).map(x => x.replace(/^-\s*/, ''));
        struct.flows = struct.body.filter(x => x.startsWith('~')).map(x => x.replace(/^~\s*/, ''));
        struct.conditions = struct.body.filter(x => x.startsWith('*')).map(x => x.replace(/^\*\s*/, ''));
        break;
      case TYPES['@']:  // command: SERVICE_NAME [GET|POST] ENDPOINT
        const tokens = struct.head[0].split(' ');
        if (tokens.length === 2) {
          struct.name = tokens[0];
          struct.options = ['GET', tokens[1]];
        } else if (tokens.length === 3) {
          const action = /post/i.test(tokens[1]) ? 'post' : 'get';
          struct.name = tokens[0];
          struct.options = [action, tokens[2]];
        } else {
          throw new Error('invalid command');
        }
        break;
      case TYPES['>']:
        struct.conditions = struct.body.filter(x => x.startsWith('*')).map(x => x.replace(/^\*\s*/, ''));
        break;

    }
    return struct;
  }

  toString() {
    return `${this.type}: ${this.options.join(',')}`;
  }

}
