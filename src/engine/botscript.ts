import { EventEmitter } from 'events';
import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';
import { IActivator } from '../interfaces/activator';
import * as utils from '../lib/utils';
import { REGEX_COND_REPLY_TESTER, REGEX_COND_REPLY_TOKEN, REGEX_COND_LAMDA_EXPR } from '../lib/regex';
import { Types, PluginCallback } from '../interfaces/types';
import { createNextRequest } from './next';
import { PLUGINS_BUILT_IN } from '../plugins/built-in';

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
   * Last request
   */
  lastRequest?: Request;

  constructor() {
    super();
    this.context = new Context();
    this.logger = new Logger('Engine');
    this.machine = new BotMachine();
    this.parse(PLUGINS_BUILT_IN);

    // add built-in patterns (NLU)
    this.addPatternCapability({
      name: 'nlu test',
      match: /^intent/,
      func: (pattern: string, req: Request) => {
        this.logger.info('NLU Preprocess: ', pattern);
        // return custom pattern
        return ({
          source: pattern,
          test: (input) => {
            const vIntentName = pattern.replace(/^intent:/i, '').trim();
            this.logger.info(`NLU test: ${input}, intent: ${req.intent}`);
            return req.intent === vIntentName;
          },
          exec: (input) => {
            // entities list
            this.logger.info('NLU extract entities: ', input);
            if (!Array.isArray(req.entities)) {
              return [];
            }
            return req.entities.map((x: any) => x.value);
          },
          toString: () => pattern,
        });
      },
    });
  }

  /**
   * Override emitter
   * @param event
   * @param args
   */
  emit(event: string | symbol, ...args: any[]) {
    const vResult = super.emit(event, ...args);
    this.logger.debug(`Fired event: '${event.toString()}', hasListener: (${vResult})`);
    super.emit('*', event, ...args);
    return vResult;
  }

  /**
   * Script structure parser
   * @param content
   */
  parse(content: string) {
    const scripts = this.context.parse(content);
    // notify event parse botscript data context
    this.emit('parse', scripts);
    return this;
  }

  /**
   * Script data parse from Url.
   * @param url
   */
  async parseUrl(url: string) {
    await this.context.parseUrl(url);
    return this;
  }

  async init() {
    await this.context.init();
    this.logger.info('Ready!');
    this.emit('ready');
    return this;
  }

  /**
   * Add trigger pattern capability
   * @param options name, match, func
   */
  addPatternCapability({ name, match, func }: {
    name: string,
    match: RegExp,
    func: (pattern: string, req: Request) => RegExp | IActivator,
  }) {
    this.context.patterns.set(name, { name, match, func });
    return this;
  }

  /**
   * Async handle message request then create response back
   * @param req
   * @param ctx
   */
  async handleAsync(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    const request = context.newRequest(req);

    // req.botId = context.id;
    // req.isForward = false;

    req = request;
    if (!context.ready) {
      await context.init();
    }

    // fire plugin for pre-processing
    const postProcessing = await this.preProcessRequest(req, context);

    // fires state machine to resolve request
    this.machine.resolve(req, context);

    // Handle conditional commands, conditional reply
    await this.applyConditionalDialogues(req, context);
    this.populateReply(req, context);

    // post-processing
    await this.postProcessRequest(postProcessing, req, context);

    // emit reply done.
    this.emit('reply', req, ctx);

    // remember last request
    this.lastRequest = req;
    if (!this.lastRequest.isFlowing) {
      // TODO: Refactor and move bot reply to ./response.model
      this.logger.info('Clean dialogue flows as a completed task: ' + req.message);
      this.lastRequest.flows = [];
      this.lastRequest.missingFlows = [];
      this.lastRequest.resolvedFlows = [];
    }
    return req;
  }

  /**
   * Run pre-process request
   * @param plugins Context plugin
   * @param req
   * @param ctx
   */
  private async preProcessRequest(req: Request, ctx: Context) {
    const postProcessing: PluginCallback[] = [];
    const activatedPlugins: PluginCallback[] = [];
    const plugins = [...ctx.plugins.keys()];

    plugins
      .forEach(x => {
        // check context conditional plugin for activation
        const info = ctx.plugins.get(x) as Struct;
        for (const cond of info.conditions) {
          if (!utils.evaluate(cond, req.contexts)) {
            return false;
          }
        }

        // deconstruct group of plugins from (struct:head)
        info.head.forEach(plugin => {
          // Normalize plugin name
          const vPluginName = `plugin:${plugin.replace(/\s+/g, '')}`;
          if (ctx.directives.has(vPluginName)) {
            this.logger.debug('context plugin is activated: [%s]', vPluginName);
            const pluginHandler = ctx.directives.get(vPluginName)?.value as PluginCallback;
            activatedPlugins.push(pluginHandler);
          } else {
            this.logger.warn('context plugin not found: [%s]!', vPluginName);
          }
        });
      });

    // fire plugin pre-processing
    for (const plugin of activatedPlugins) {
      this.logger.debug('plugin fire: %s', plugin.name);
      const vPostProcessing = await plugin(req, ctx);
      if (typeof vPostProcessing === 'function') {
        postProcessing.push(vPostProcessing);
      }
    }

    return postProcessing;
  }

  /**
   * Run post-process request
   * @param plugins context plugin
   * @param req
   * @param ctx
   */
  private async postProcessRequest(plugins: PluginCallback[], req: Request, ctx: Context) {
    // post-processing
    for (const plugin of plugins) {
      await plugin(req, ctx);
    }
  }

  /**
   * Test & apply conditional dialogue
   * @param req
   * @param ctx
   */
  private async applyConditionalDialogues(req: Request, ctx: Context): Promise<Request> {
    if (req.isNotResponse) {
      this.logger.info('Bot has no response! Conditions will not be applied.');
      return req;
    }
    this.logger.info('Evaluate conditions for dialogue:', req.currentDialogue, req.contexts);
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
      // filter only conditional reply dialogue
      .filter(x => {
        // pattern ensures valid syntax: expr => action
        const match = REGEX_COND_REPLY_TESTER.exec(x) as RegExpExecArray;
        if (!match) {
          this.logger.debug('Not a conditional reply:', x);
          return false;
        } else {
          return true;
        }
      })
      .map(x => {
        // Re-run tester to get verify expression
        const match = REGEX_COND_REPLY_TESTER.exec(x) as RegExpExecArray;
        // split exactly supported conditions
        const tokens = x.split(REGEX_COND_LAMDA_EXPR);
        let type = match[1];
        const expr = tokens[0].trim();
        let value = tokens[1].trim();
        // New syntax support
        // https://github.com/yeuai/botscript/issues/20
        if (type === '=') {
          this.logger.info('New syntax support: ' + x);
          const explicitedType = value.charAt(0);
          if (REGEX_COND_REPLY_TOKEN.test(explicitedType)) {
            type = explicitedType;
            value = value.slice(1).trim();
          } else {
            // default type (a reply)
            // ex: * expression => a reply
            // or: * expression => - a reply
            type = Types.ConditionalReply;
          }
        }
        // e.g. a conditional reply to call http service
        // * $reg_confirm == 'yes' @> register_account
        // * $name == undefined -> You never told me your name
        return { type, expr, value };
      })
      .filter(x => {
        const vTestResult = utils.evaluate(x.expr, req.contexts);
        this.logger.info(`Evaluate test: ${vTestResult} is ${!!vTestResult} | ${x.expr} => ${x.type} ${x.value}`);
        return vTestResult;
      });

    this.logger.info('Conditions test passed:', dialogConditions);

    for (const x of dialogConditions) {
      if (x.type === Types.ConditionalForward) {
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
      } else if (x.type === Types.ConditionalFlow) {
        let vIsAddedFlow = false;
        const flow = x.value;
        if (
          req.resolvedFlows.indexOf(flow) < 0
          && req.missingFlows.indexOf(flow) < 0
          && !req.isFlowing
        ) {
          this.logger.info('Add conditional flow: ', flow, req.resolvedFlows);
          req.missingFlows.push(flow);
          vIsAddedFlow = true;
        }

        if (vIsAddedFlow) {
          req.isFlowing = true;
          req.currentFlowIsResolved = false;
          // req.currentFlow = req.missingFlows.find(() => true) as string;
          this.logger.debug('Resolve conditional flow of current dialogue: ' + req.currentDialogue);
          this.machine.resolve(req, ctx);
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

            // append result into variables
            this.logger.debug('Append command result into variables:', x.value);
            this.emit('command', null, { req, ctx, result, name: command.name });
            if (!Array.isArray(result)) {
              // backwards compatibility.
              // TODO: Remove in version 2.x
              Object.assign(req.variables, result);
            }
            Object.assign(req.variables, { [command.name]: result });
          } catch (err) {
            this.logger.info('Cannot call http service: ', command);
            this.emit('command', err, { req, ctx, name: command.name });
          }
        } else {
          this.logger.warn('No command definition:', x.value);
          this.emit('command', 'No command definition!', { req, ctx, name: x.value });
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
      this.logger.info('Populate already candidate:', req.speechResponse, req.contexts);
    }

    // Generate output!
    req.speechResponse = ctx.interpolate(replyCandidate || '[noReply]', req);
    this.logger.info(`Populate speech response: ${req.message} -> ${replyCandidate} -> ${req.speechResponse}`);
    // Add previous speech history
    // Since v1.6: system variables are initialized before process!
    req.previous.splice(0, 0, req.speechResponse);
    if (req.previous.length > 100) {
      req.previous.pop();
    }

    return req;
  }

  /**
   * New request flows
   */
  newRequest(message: string) {
    return createNextRequest(message, this.lastRequest);
  }

}
