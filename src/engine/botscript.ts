import { Context } from './context';
import { Request } from './request';
import { Struct, TYPES } from './struct';
import { execPattern, getActivators } from './pattern';
import { Logger } from '../lib/logger';
import * as utils from '../lib/utils';
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
  logger: Logger;

  constructor() {
    this.context = new Context();
    this.logger = new Logger();
    this.machine = new BotMachine();
  }

  /**
   * Return ready bot engine
   * TODO: Remove
   */
  then(/** */) {
    return this;
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
    if (!req.isFlowing) {
      // process purpose bot
      for (const [name, dialog] of this.context.dialogues) {
        const isMatch = this.buildResponse(req, dialog);
        this.logger.debug('Test matching: ', name, isMatch);
        if (isMatch) {
          req.currentDialogue = dialog.name;
          break;
        }
      }
    } else {
      // TODO: find one candidate in dialogue flows
      const dialog = this.context.dialogues.get(req.currentDialogue);
      // Get next flows

    }

    // fires state machine to resolve request
    this.machine.resolve(req, this.context);
    this.logger.debug('Reply: ', req.speechResponse, req);

    return req;
  }

  /**
   * Build current context response
   * @param dialog
   * @param trigger
   * @param req
   */
  private buildResponse(req: Request, dialog: Struct) {
    const result = getActivators(dialog, this.context.definitions)
      .filter((x) => RegExp(x.source, x.flags).test(req.message))
      .some(pattern => {
        this.logger.info('Found: ', dialog.name, pattern.source);

        if (dialog.flows.length > 0) {
          // TODO: resolves deepest flow (node leaf)
          req.flows = dialog.flows; // .map(x => x.replace(/ .*/, ''));
          // mark dialogue name as the current node
          req.currentDialogue = dialog.name;
          // TODO: fires machine (FSM) start
        }

        const captures = execPattern(req.message, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
        // add $ as the first matched variable
        req.variables.$ = captures.$1;
        // reference to the last input
        req.variables.$input = req.message;

        const replyCandidate = utils.random(dialog.replies);
        req.speechResponse = this.context.interpolate(replyCandidate, req);
        return true;
      });

    return result;
  }

}
