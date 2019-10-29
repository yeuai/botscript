import { Context } from './context';
import { Request } from './request';
import { Struct, TYPES } from './struct';
import { Logger } from '../lib/logger';
import { transform } from './pattern';

/**
 * BotScript dialogue engine
 */
export class BotScript {

  data: Context;
  logger: Logger;

  constructor() {
    this.data = new Context();
    this.logger = new Logger();
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
      .replace(/^!/gm, '\n!')
      // concat multiple lines (normalize)
      .replace(/\n\^/gm, ' ')
      // split structure by linebreaks
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
      this.data.dialogues.forEach((dialog: any, trigger: string) => this.buildResponse(dialog, trigger, req));
    }
  }

  /**
   * Build current context response
   * @param dialog
   * @param trigger
   * @param req
   */
  buildResponse(dialog: Struct, trigger: string, req: Request) {
    const result = this.getActivators(dialog).filter(() => true).some(pattern => {
      this.logger.info('Pattern: ', pattern);
    });

    if (result) {
      this.logger.info('Handle request ok!', 123);
    } else {
      this.logger.info('Handle request nok!', 123);
    }

    return result;
  }

  /**
   * Get trigger activators
   * @param dialog
   * @param notEqual
   */
  getActivators(dialog: Struct, notEqual = false) {
    if (dialog.type === 'dialogue') {
      return dialog.head.map(x => transform(x, this.data.definitions, notEqual));
    } else {
      // no activator
      return [];
    }
  }
}
