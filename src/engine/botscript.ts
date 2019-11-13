import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';
import { IActivator } from '../interfaces/activator';
import * as utils from '../lib/utils';
import { Types } from '../interfaces/types';

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
   * Add trigger pattern capability
   * @param options name, match, func
   */
  addPatternCapability({ name, match, func }: {
    name: string,
    match: RegExp,
    func: (pattern: string) => RegExp | IActivator,
  }) {
    this.context.patterns.set(name, { name, match, func });
    return this;
  }

  /**
   * Handle message request then create response back
   * TODO: Please use handleAsync with supported conditional dialogues
   * @param req human request context
   * @param ctx bot data context
   */
  handle(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    // fires state machine to resolve request
    req.botId = context.id;
    this.machine.resolve(req, context);

    this.populateReply(req, context);
    return req;
  }

  /**
   * Async handle request
   * @param req
   * @param ctx
   */
  async handleAsync(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    // fires state machine to resolve request
    req.botId = context.id;
    this.machine.resolve(req, context);

    // Handle conditional commands, conditional event
    await this.applyConditionalDialogues(req, context);
    this.populateReply(req, context);

    return req;
  }

  /**
   * test & apply conditions
   * @param req
   * @param ctx
   */
  private async applyConditionalDialogues(req: Request, ctx: Context): Promise<Request> {
    this.logger.info('Evaluate conditional command for:', req.currentDialogue);
    let conditions: string[] = [];
    const dialog = ctx.getDialogue(req.currentDialogue) as Struct;
    if (dialog) {
      conditions = dialog.conditions;
    }

    // support original conditions
    if (req.currentDialogue !== req.originalDialogue && ctx.dialogues.has(req.originalDialogue)) {
      conditions = conditions.concat((ctx.dialogues.get(req.originalDialogue) as Struct).conditions);
    }

    const dialogConditions = conditions
      .map(x => {
        const match = /([->@?])>/.exec(x) as RegExpExecArray;
        if (!match) {
          return false;
        } else {
          const tokens = x.split(/[->@?]>/);
          if (tokens.length === 2) {
            return {
              type: match[1],
              expr: tokens[0].trim(),
              value: tokens[1].trim(),
            };
          } else {
            return false;
          }
        }
      })
      .filter(x => {
        if (x === false) {
          return false;
        }
        this.logger.info('Evaluate test: ', x.type, x.expr, x.value);
        return utils.evaluate(x.expr, req.variables);
      });

    for (const x of dialogConditions) {
      if (!x) {
        return req;
      } else if (x.type === Types.Forward) {
        // conditional forward
      } else if (x.type === Types.Reply) {
        // conditional reply
        const reply = x.value;
        this.logger.info('Populate speech response, with conditional reply:', req.message, reply);
        // speech response candidate
        req.speechResponse = reply;
      } else if (x.type === Types.Prompt) {
        // conditional prompt
      } else if (x.type === Types.Command) {
        // conditional command
        if (ctx.commands.has(x.value)) {
          const command = ctx.commands.get(x.value) as Struct;

          // execute commands
          this.logger.debug('Execute command: ', x.value);
          const result = await utils.callHttpService(command, req);

          // populate result into variables
          this.logger.debug('Populate command result into variables:', x.value, result);
          Object.assign(req.variables, result);
        } else {
          this.logger.warn('No command definition: ', x.value);
        }
      }

    }
    return req;
  }

  /**
   * Generate speech response
   * @param req
   * @param ctx
   */
  private populateReply(req: Request, ctx: Context): Request {

    this.logger.info(`Current request: isFlowing=${req.isFlowing}, dialogue=${req.currentDialogue}, flow=${req.currentFlow}`);

    // no reply candidate
    if (!req.speechResponse) {
      let dialog: Struct;
      if (!req.isFlowing) {
        // TODO: Get current dialogue?
        dialog = ctx.dialogues.get(req.originalDialogue) as Struct;
      } else {
        dialog = ctx.flows.get(req.currentFlow) as Struct;
      }
      if (dialog) {
        this.logger.info('Get dialogue candidate:', dialog.name);
        const replyCandidate = utils.random(dialog.replies);
        req.speechResponse = replyCandidate;
      } else {
        this.logger.info('No dialogue population!');
      }
    } else {
      this.logger.info('Populate already candidate:', req.speechResponse);
    }

    // Generate output!
    req.speechResponse = ctx.interpolate(req.speechResponse || '[empty]', req);
    this.logger.info(`Populate speech response: ${req.message} -> ${req.speechResponse}`);

    return req;
  }

}
