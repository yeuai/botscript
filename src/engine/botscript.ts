import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';

/**
 * BotScript dialogue engine
 */
export class BotScript {

  /**
   * Bot data context
   */
  context: Context;

  /**
   * Bot state machine
   */
  machine: BotMachine;

  /**
   * Bot logger
   */
  logger: Logger;

  constructor() {
    this.context = new Context();
    this.logger = new Logger();
    this.machine = new BotMachine();
  }

  /**
   * Get struct type
   * @param type type
   */
  private type(type: string): Map<string, any> {
    switch (type) {
      case 'variable':
        return this.context.variables;
      case 'dialogue':
        return this.context.dialogues;
      case 'definition':
        return this.context.definitions;
      case 'question':
        return this.context.questions;
      case 'flows':
        return this.context.flows;
      case 'command':
        return this.context.commands;
      default:
        throw new Error('Not found type: ' + type);
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
    this.logger.debug('New request: ', req.message);
    // fires state machine to resolve request
    return this.machine.resolve(req, this.context);
  }

  /**
   * Add trigger pattern capability
   * @param options name, match, func
   */
  addPatternCapability({name, match, func}: {
    name: string,
    match: RegExp,
    func: (pattern: string) => RegExp,
  }) {
    this.context.patterns.set(name, {name, match, func});
  }

}
