import { Context } from './context';
import { Request } from './request';
import { Struct, TYPES } from './struct';

/**
 * BotScript dialogue engine
 */
export class BotScript {

  data: Context;

  constructor() {
    this.data = new Context();
  }

  /**
   * Return ready bot engine
   */
  then(/** */) {
    return this;
  }

  private type(t: string): Map<string, any> {
    switch (t) {
      case 'variable':
        return this.data.variables;
      case 'dialogue':
        return this.data.dialogues;
      case 'definition':
        return this.data.definitions;
      case 'question':
        return this.data.questions;
      case 'dialogflows':
        return this.data.dialogflows;
      case 'command':
        return this.data.commands;
      default:
        throw new Error('Not found type: ' + t);
    }
  }

  /**
   * Script structure parser
   * @param content
   */
  parse(content: string) {
    const scripts = content
      // convert CRLF into LF
      .replace(/\r\n/g, '\n')
      // remove comments
      .replace(/^#.*$\n/igm, '')
      // split script structure by linebreaks
      .split(/\n{2,}/)
      // remove empty lines
      .filter(script => script)
      // trim each of them
      .map(script => script.trim());

    scripts.forEach(data => {
      const struct = Struct.parse(data);
      if (!struct.name) {
        const tokens = struct.content.match(/^\s*[<>=~\-@?`]\s*(.+)$/m);
        if (tokens != null && tokens.length > 1) {
          struct.name = tokens[1];
        }
      }
      console.log('Parse type: ' + struct.type);
      // valuable data struct
      switch (struct.type) {
        case TYPES['!']:
          const tokens = struct.content
            .replace(/^!.+$\n\s*-/m, '')
            .split(/^\s*-\s*/m);
          if (tokens.length > 1) {
            struct.options = tokens.map(s => s.trim());
            struct.value = struct.options;
          } else {
            struct.options = struct.content.replace(/^!+\s*/m, '').split(' ').splice(0, 1);
            struct.value = struct.options.find(x => true);
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
      // append bot data struct
      this.type(struct.type).set(struct.name, struct);
    });

    return this;
  }

  /**
   * Handle message request then create response back
   * @param req
   */
  handle(req: Request) {
    if (!req.complete) {
      // process purpose bot
    } else {

    }
  }
}
