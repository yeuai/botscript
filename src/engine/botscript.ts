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
      // separate definition struct (normalize)
      .replace(/^!/igm, '\n!')
      // split script structure by linebreaks
      .split(/\n{2,}/)
      // remove empty lines
      .filter(script => script)
      // trim each of them
      .map(script => script.trim());

    scripts.forEach(data => {
      const struct = Struct.parse(data);
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
