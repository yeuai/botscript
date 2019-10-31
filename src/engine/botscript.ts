import { Context } from './context';
import { Request } from './request';
import { Struct, TYPES } from './struct';
import { transform, execPattern } from './pattern';
import { Logger } from '../lib/logger';
import * as utils from '../lib/utils';
import { BotMachine } from './machine';

/**
 * BotScript dialogue engine
 */
export class BotScript {

  data: Context;
  machine: BotMachine;
  logger: Logger;

  constructor() {
    this.data = new Context();
    this.logger = new Logger();
    this.machine = new BotMachine(this.data);
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
        return this.data.variables;
      case 'dialogue':
        return this.data.dialogues;
      case 'definition':
        return this.data.definitions;
      case 'question':
        return this.data.questions;
      case 'flows':
        return this.data.flows;
      case 'command':
        return this.data.commands;
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
    if (!req.complete) {
      // process purpose bot
      this.data.dialogues.forEach((dialog: any, name: string) => {
        const isMatch = this.buildResponse(req, dialog);
        this.logger.debug('Test matching: ', name, isMatch);
      });
    }

    return req;
  }

  /**
   * Build current context response
   * @param dialog
   * @param trigger
   * @param req
   */
  private buildResponse(req: Request, dialog: Struct) {
    const result = this.getActivators(dialog)
      .filter((x) => RegExp(x.source, x.flags).test(req.input))
      .some(pattern => {
        this.logger.info('Found: ', dialog.name, pattern.source);

        if (dialog.flows.length > 0) {
          // get the first word as contexts
          // TODO: resolves deepest flow (node leaf)
          req.flows = dialog.flows.map(x => x.replace(/ .*/, ''));
          // mark dialogue name as the current node
          req.currentNode = dialog.name;
          // TODO: fires machine (FSM) start
        }

        const captures = execPattern(req.input, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
        // add $ as the first matched variable
        req.variables.$ = captures.$1;

        const replyCandidate = utils.random(dialog.options);
        req.speechResponse = this.data.interpolate(replyCandidate, req);
      });

    return result;
  }

  /**
   * Get trigger activators
   * @param dialog
   * @param notEqual
   */
  private getActivators(dialog: Struct, notEqual = false) {
    if (dialog.type === 'dialogue') {
      return dialog.head.map(x => transform(x, this.data.definitions, notEqual));
    } else {
      // no activator
      return [];
    }
  }
}
