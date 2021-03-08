import { EventEmitter } from 'events';
import { Context } from './context';
import { Request } from './request';
import { Struct } from './struct';
import { Logger } from '../lib/logger';
import { BotMachine } from './machine';
import { IActivator } from '../interfaces/activator';
import * as utils from '../lib/utils';
import { Types, PluginCallback } from '../interfaces/types';
import { addTimeNow, noReplyHandle, normalize, nlu } from '../plugins';

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
  plugins: Map<string, (req: Request, ctx: Context) => void | Promise<any> | PluginCallback>;

  constructor() {
    super();
    this.context = new Context();
    this.logger = new Logger('Engine');
    this.machine = new BotMachine();
    this.plugins = new Map();

    // add built-in plugins
    this.plugin('addTimeNow', addTimeNow);
    this.plugin('noReplyHandle', noReplyHandle);
    this.plugin('normalize', normalize);
    this.plugin('nlu', nlu);

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
      case 'directive':
        return this.context.directives;
      default:
        throw new Error('Not found type: ' + type);
    }
  }

  /**
   * Script structure parser
   * @param content
   */
  parse(content: string) {
    const vContent = content
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

    if (!vContent) {
      // do nothing
      return this;
    }

    // notify event parse botscript data content
    this.emit('parse', vContent);

    const scripts = vContent
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
   * Script data parse from Url.
   * @param url
   */
  async parseUrl(url: string) {
    try {
      const vListData = await utils.downloadScripts(url);
      for (const vItem of vListData) {
        this.parse(vItem);
      }
    } catch (error) {
      const { message } = error;
      this.logger.error(`Cannot download script:
      - Url: ${url}
      - Msg: ${message || error}`);
    }
  }

  async init() {
    // parse include directive
    for (const item of this.context.directives.keys()) {
      this.logger.info('Preprocess directive:', item);
      if (/^include/.test(item)) {
        const vInclude = this.context.directives.get(item) as Struct;
        for (const vLink of vInclude.options) {
          this.logger.info('Parse url from:', vLink);
          await this.parseUrl(vLink);
        }
      }
    }
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
   * Add plugin system
   * @param name
   * @param func
   */
  plugin(name: string, func: PluginCallback) {
    this.plugins.set(name, func);
  }

  /**
   * Async handle message request then create response back
   * @param req
   * @param ctx
   */
  async handleAsync(req: Request, ctx?: Context) {
    this.logger.debug('New request: ', req.message);
    const context = ctx || this.context;
    // req.botId = context.id;
    req.isForward = false;

    // fire plugin for pre-processing
    const plugins = [...context.plugins.keys()];
    const postProcessing = await this.preProcessRequest(plugins, req, context);

    // fires state machine to resolve request
    this.machine.resolve(req, context);

    // Handle conditional commands, conditional reply
    await this.applyConditionalDialogues(req, context);
    this.populateReply(req, context);

    // post-processing
    await this.postProcessRequest(postProcessing, req, context);

    // emit reply done.
    this.emit('reply', req, ctx);
    return req;
  }

  /**
   * Run pre-process request
   * @param plugins Context plugin
   * @param req
   * @param ctx
   */
  private async preProcessRequest(plugins: string[], req: Request, ctx: Context) {
    const postProcessing: PluginCallback[] = [];
    const activatedPlugins: PluginCallback[] = [];

    plugins
      .forEach(x => {
        if (!ctx.plugins.has(x)) {
          return false;
        }

        // check context conditional plugin for activation
        // TODO: Support multiple (AND) conditions
        const info = ctx.plugins.get(x) as Struct;
        const cond = info.conditions.find(() => true) as string;
        if (typeof cond === 'string' && !utils.evaluate(cond, req)) {
          return false;
        } else {
          this.logger.debug('context conditional plugin is activated: (%s) %s', x, cond);
        }

        // deconstruct group of plugins from (struct:head)
        info.head.forEach(p => {
          if (this.plugins.has(p)) {
            this.logger.debug('context plugin is activated:: (%s)', p);
            const pluginGroup = this.plugins.get(p) as PluginCallback;
            activatedPlugins.push(pluginGroup);
          }
        });
      });

    // fire plugin pre-processing
    for (const plugin of activatedPlugins) {
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
      // filter only conditional reply dialogue
      // .filter(x => !/^%/.test(x)) // TODO: Remove deprecated previous conditions
      .map(x => {
        const REGEX_COND_REPLY_TESTER = /([->@?+=])>/;
        const REGEX_COND_REPLY_TOKEN = /[->@?+=]>/;
        const match = REGEX_COND_REPLY_TESTER.exec(x) as RegExpExecArray;

        if (!match) {
          this.logger.debug('Not a conditional reply:', x);
          return false;
        } else {
          // split exactly supported conditions
          const tokens = x.split(REGEX_COND_REPLY_TOKEN);
          if (tokens.length === 2) {
            let type = match[1];
            const expr = tokens[0].trim();
            let value = tokens[1].trim();
            // New syntax support
            // https://github.com/yeuai/botscript/issues/20
            if (type === '=') {
              this.logger.info('New syntax support: ' + x);
              const explicitedType = value[0];
              if (/^[->@?+]>/.test(explicitedType)) {
                type = explicitedType;
                value = value.slice(1);
              } else {
                // default type (a reply)
                // ex: * expression => a reply
                // or: * expression => - a reply
                type = Types.ConditionalReply;
              }
            }
            // Ex: Conditional reply to call http service
            // * $reg_confirm == 'yes' @> register_account
            // * $name == undefined -> You never told me your name
            return { type, expr, value };
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

    this.logger.info('Conditions test: ', dialogConditions);

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
            this.logger.info('Cannot call http service: ', command);
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
    req.speechResponse = ctx.interpolate(replyCandidate || '[noReply]', req);
    this.logger.info(`Populate speech response: ${req.message} -> ${replyCandidate} -> ${req.speechResponse}`);
    // Add previous speech history
    // TODO: make sure previous has initialized!
    req.previous.splice(0, 0, req.speechResponse);
    if (req.previous.length > 100) {
      req.previous.pop();
    }

    return req;
  }

}
