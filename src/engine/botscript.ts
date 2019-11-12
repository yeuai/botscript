import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';
import { IActivator } from '../interfaces/activator';

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
      case 'definition':
        return this.context.definitions;
      case 'dialogue':
        return this.context.dialogues;
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
      // remove spacing
      .replace(/\n +/g, '\n')
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
   * @param req human request context
   * @param ctx bot data context
   */
  handle(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    // fires state machine to resolve request
    req.botId = context.id;
    return this.machine.resolve(req, context);
  }

  /**
   * Add trigger pattern capability
   * @param options name, match, func
   */
  addPatternCapability({name, match, func}: {
    name: string,
    match: RegExp,
    func: (pattern: string) => RegExp | IActivator,
  }) {
    this.context.patterns.set(name, {name, match, func});
    return this;
  }

}
