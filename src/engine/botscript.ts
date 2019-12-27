import { EventEmitter } from 'events';
import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';
import { IActivator } from '../interfaces/activator';
import * as utils from '../lib/utils';
import { Types, PluginCallback } from '../interfaces/types';
import { addTimeNow, noReplyHandle, normalize } from '../plugins';

/**
 * BotScript dialogue engine
 */
export class BotScript extends EventEmitter {

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

  /**
   * plugins system
   */
  plugins: Map<string, (req: Request, ctx: Context) => void | PluginCallback>;

  constructor() {
    super();
    this.context = new Context();
    this.logger = new Logger();
    this.machine = new BotMachine();
    this.plugins = new Map();

    // add built-in plugins
    this.plugin('addTimeNow', addTimeNow);
    this.plugin('noReplyHandle', noReplyHandle);
    this.plugin('normalize', normalize);
  }

  /**
   * Override emitter
   * @param event
   * @param args
   */
  emit(event: string | symbol, ...args: any[]) {
    const vResult = super.emit(event, ...args);
    this.logger.debug(`Fired event: '${event.toString()}' (${vResult})`);
    super.emit('*', event, ...args);
    return vResult;
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
      case 'plugin':
        return this.context.plugins;
      default:
        throw new Error('Not found type: ' + type);
    }
  }

  /**
   * Script structure parser
   * @param content
   */
  parse(content: string) {
    content = content
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
      // remove spaces
      .trim();

    if (!content) {
      // do nothing
      return this;
    }

    const scripts =  content
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
   * Add plugin system
   * @param name
   * @param func
   */
  plugin(name: string, func: PluginCallback) {
    this.plugins.set(name, func);
  }

  /**
   * Handle message request then create response back
   * Notice: use handleAsync with supported conditional dialogues
   * TODO: Remove this version (only use hanldeAsync)?
   * @param req human request context
   * @param ctx bot data context
   */
  handle(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    // fires state machine to resolve request
    req.botId = context.id;
    req.isForward = false;

    // fire plugin for pre-processing
    const plugins = [...context.plugins.keys()];
    const postProcessing = this.preProcessRequest(plugins, req, context);

    this.machine.resolve(req, context);

    this.populateReply(req, context);

    // post-processing
    this.postProcessRequest(postProcessing, req, context);

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
    req.botId = context.id;
    req.isForward = false;

    // fire plugin for pre-processing
    const plugins = [...context.plugins.keys()];
    const postProcessing = this.preProcessRequest(plugins, req, context);

    // fires state machine to resolve request
    this.machine.resolve(req, context);

    // Handle conditional commands, conditional event
    await this.applyConditionalDialogues(req, context);
    this.populateReply(req, context);

    // post-processing
    this.postProcessRequest(postProcessing, req, context);

    return req;
  }

  /**
   * Run pre-process request
   * @param plugins Context plugin
   * @param req
   * @param ctx
   */
  private preProcessRequest(plugins: string[], req: Request, ctx: Context) {
    const postProcessing: PluginCallback[] = [];
    const ctxPlugins = plugins
      .filter(x => {
        // TODO: check context conditional plugin for activation
        // TODO: deconstruct group of plugins
        return this.plugins.has(x);
      })
      .map(x => this.plugins.get(x)) as PluginCallback[];

    // fire plugin pre-processing
    ctxPlugins.forEach(item => {
      if (this.plugins.has(item.name)) {
        const plugin = this.plugins.get(item.name) as PluginCallback;
        const vPostProcessing = plugin(req, ctx);
        if (typeof vPostProcessing === 'function') {
          postProcessing.push(vPostProcessing);
        }
      }
    });
    return postProcessing;
  }

  /**
   * Run post-process request
   * @param plugins context plugin
   * @param req
   * @param ctx
   */
  private postProcessRequest(plugins: PluginCallback[], req: Request, ctx: Context) {
    // post-processing
    plugins.forEach(item => {
      item(req, ctx);
    });
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
        const match = /([->@?+])>/.exec(x) as RegExpExecArray;
        if (!match) {
          return false;
        } else {
          // split exactly supported conditions
          const tokens = x.split(/[->@?+]>/);
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
      } else if (x.type === Types.ConditionalForward) {
        // conditional forward
        if (ctx.dialogues.has(x.value)) {
          req.isForward = true;
          req.isFlowing = false;
          this.logger.info('Redirect dialogue to:', x.value);
          req.currentDialogue = x.value;
          this.machine.resolve(req, ctx);
        } else {
          this.logger.warn('No forward destination:', x.value);
        }
      } else if (x.type === Types.ConditionalReply) {
        // conditional reply
        const reply = x.value;
        this.logger.info('Populate speech response, with conditional reply:', req.message, reply);
        // speech response candidate
        req.speechResponse = reply;
      } else if (x.type === Types.ConditionalPrompt) {
        // conditional prompt
        this.logger.debug('Get prompt definition:', x.value);
        if (ctx.definitions.has(x.value)) {
          req.prompt = (ctx.definitions.get(x.value) as Struct).options;
        } else {
          this.logger.warn('No prompt definition:', x.value);
        }
      } else if (x.type === Types.ConditionalCommand) {
        // conditional command
        if (ctx.commands.has(x.value)) {
          const command = ctx.commands.get(x.value) as Struct;

          try {
            // execute commands
            this.logger.debug('Execute command: ', x.value);
            const result = await utils.callHttpService(command, req);

            // populate result into variables
            this.logger.debug('Populate command result into variables:', x.value, result);
            this.emit('command', null, req, ctx, command.name, result);
            Object.assign(req.variables, result);
          } catch (err) {
            this.emit('command', err, req, ctx, command.name);
          }
        } else {
          this.logger.warn('No command definition:', x.value);
          this.emit('command', 'No command definition!', req, ctx, x.value);
        }
      } else if (x.type === Types.ConditionalEvent) {
        // conditional event
        this.logger.debug('Emit conditional event:', x.value);
        this.emit(x.value, req, ctx);
      } else {
        this.logger.warn('Unknow condition type:', x.type, x.expr, x.value);
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

    let replyCandidate = req.speechResponse;
    this.logger.info(`Current request: isFlowing=${req.isFlowing}, dialogue=${req.currentDialogue}, flow=${req.currentFlow}, replyCandidate=${replyCandidate}`);

    // no reply candidate
    if (!replyCandidate) {
      let dialog: Struct;
      if (!req.isFlowing) {
        // TODO/Refactor: Get current dialogue?
        dialog = ctx.dialogues.get(req.originalDialogue) as Struct;
      } else {
        dialog = ctx.flows.get(req.currentFlow) as Struct;
      }
      if (dialog) {
        this.logger.info('Get dialogue candidate:', dialog.name);
        replyCandidate = utils.random(dialog.replies);
      } else {
        this.logger.info('No dialogue population!');
      }
    } else {
      this.logger.info('Populate already candidate:', req.speechResponse);
    }

    // Generate output!
    req.speechResponse = ctx.interpolate(replyCandidate || '[empty]', req);
    this.logger.info(`Populate speech response: ${req.message} -> ${replyCandidate} -> ${req.speechResponse}`);
    this.emit('reply', req, ctx);

    return req;
  }

}
