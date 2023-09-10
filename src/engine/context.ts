import { interpolate } from '../lib/template';
import { Request } from './request';
import { Struct } from './struct';
import { IActivator } from '../interfaces/activator';
import { Logger } from '../lib/logger';
import { Trigger } from './trigger';
import { wrapCode, wrapCodeBrowser } from '../plugins/built-in';
import * as utils from '../lib/utils';

/**
 * Bot context
 */
export class Context {

  // dialogue structures
  definitions: Map<string, Struct>;
  dialogues: Map<string, Struct>;
  commands: Map<string, Struct>;
  flows: Map<string, Struct>;
  // support custom patterns
  patterns: Map<string, { name: string, match: RegExp, func: (pattern: string, req: Request) => RegExp | IActivator }>;
  // plugins system
  plugins: Map<string, Struct>;
  // directives system
  directives: Map<string, Struct>;
  /**
   * id context
   */
  idctx: string;
  ready: boolean;

  private _sorted_triggers: Trigger[];
  private logger = new Logger('Context');

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.flows = new Map();
    this.commands = new Map();
    this.patterns = new Map();
    this.plugins = new Map();
    this.directives = new Map();
    this.idctx = utils.newid();
    this._sorted_triggers = [];
  }

  /**
   * Get bot id from definition
   */
  get id(): string {
    return this.definitions.has('botid')
      ? (this.definitions.get('botid') as Struct).value
      : this.idctx;
  }

  /**
   * Get all of context triggers
   */
  get triggers(): Trigger[] {
    if (this._sorted_triggers?.length > 0) {
      return this._sorted_triggers;
    } else {
      this.sortTriggers();
      return this._sorted_triggers;
    }
  }

  /**
   * Get struct type
   * @param type type
   */
  private type(type: string): Map<string, Struct> {
    switch (type) {
      case 'definition':
        return this.definitions;
      case 'dialogue':
        return this.dialogues;
      case 'flows':
        return this.flows;
      case 'command':
        return this.commands;
      case 'plugin':
        return this.plugins;
      case 'directive':
        return this.directives;
      default:
        throw new Error('Not found type: ' + type);
    }
  }

  /**
   * Add context struct
   * @param struct
   */
  add(struct: Struct) {
    this.type(struct.type).set(struct.name, struct);
    return this;
  }

  /**
   * Script structure parser
   * @param content
   */
  parse(content: string) {
    if (!content) {
      throw new Error('Cannot parse script: null or empty!');
    }
    const scripts = Struct.normalize(content);
    scripts.forEach(data => {
      const struct = Struct.parse(data);
      // add context struct data types.
      this.add(struct);
    });

    return scripts;
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
      const { message } = error as Error;
      this.logger.error(`Cannot download script:
      - Url: ${url}
      - Msg: ${message || error}`);
    }
  }

  /**
   * sort trigger
   */
  sortTriggers(): void {
    const vTriggers: Trigger[] = [];
    this._sorted_triggers = [];
    Array.from(this.dialogues.values())
      .forEach(x => {
        vTriggers.push(...x.triggers.map(t => new Trigger(t, x.name)));
      });
    // sort & cache triggers.
    this._sorted_triggers = vTriggers.sort(Trigger.sorter);
    this.ready = true;
  }

  async init() {
    const logger = new Logger('Plugin');
    for (const item of this.directives.keys()) {
      this.logger.info('Preprocess directive:', item);
      if (/^include/.test(item)) {
        const vInclude = this.directives.get(item) as Struct;
        for (const vLink of vInclude.options) {
          this.logger.info('Parse url from:', vLink);
          await this.parseUrl(vLink);
        }
      } else if (/^plugin/.test(item)) {
        const vPlugin = this.directives.get(item) as Struct;
        const vCode = wrapCode(vPlugin.value);
        const vCodeBrowser = wrapCodeBrowser(vPlugin.value);
        const vName = vPlugin.name.replace(/^plugin:/, '');
        // this.this.logger.debug(`javascript code: /plugin: ${vName} => ${vCode}`);
        this.logger.debug(`add custom plugin & save handler in it own directive: /${vPlugin.name}`);
        vPlugin.value = async (req: Request, ctx: Context) => {
          // run in browser or node
          if (typeof window === 'undefined') {
            logger.debug(`Execute /plugin: ${vName} in node!`);
            const { VmRunner } = await import('../lib/vm2');
            const vPreProcess = await VmRunner.run(vCode, { req, ctx, utils, logger });
            const vPostProcessingCallback = await vPreProcess();
            // support post-processing
            this.logger.debug(`Plugin [${vName}] has pre-processed!`);
            return vPostProcessingCallback;
          } else {
            this.logger.debug(`Execute /plugin: ${vName} in browser!`);
            const { VmRunner } = await import('../lib/vm');
            const vPreProcess = await VmRunner.run(vCodeBrowser, { req, ctx, utils, logger });
            const vPostProcessingCallback = await vPreProcess();
            // support post-processing
            this.logger.debug(`Plugin [${vName}] has pre-processed!`);
            return vPostProcessingCallback;
          }
        };
      }
    }

    // sort triggers
    this.sortTriggers();
  }

  /**
   * Get dialogue by name
   * Notice: a flow is a dialogue
   * @param name
   */
  getDialogue(name: string) {
    if (this.flows.has(name)) {
      return this.flows.get(name);
    } else {
      return this.dialogues.get(name);
    }
  }

  /**
   * Get definition interpolation
   * @param text
   */
  interpolateDefinition(text: string) {
    this.logger.debug('interpolateDefinition:', text);
    return text.replace(/\[([\w-]+)\]/g, (match, defName) => {
      const definition = defName.toLowerCase();
      if (!this.definitions.has(definition)) {
        // return original
        return match;
      }
      const list = this.definitions.get(definition) as Struct;
      return utils.random(list.options);
    });
  }

  /**
   * Interpolate variables from request
   * @param text message response
   * @param req message request
   */
  interpolateVariables(text: string, req: Request) {
    this.logger.debug('interpolateVariables:', text);
    return text
      // 1. object/array referencing.
      // matching & replacing: $var.[0].a.b (note: .[0].a.b is a path of property of an array)
      .replace(/\$([a-z][\w_-]*)(\.[.\w[\]]*[\w\]])/g, (match: string, variable: string, propPath: string) => {
        try {
          const data = {};
          if (variable === 'flows') { // keyword: $flows
            const prop = propPath.replace(/^\.+/, '');
            Object.assign(data, {
              flows: {
                [prop]: req.$flows[prop],
              },
            });
          } else {
            const vValue = req.contexts[variable];
            Object.assign(data, { [variable]: vValue });
          }

          // interpolate value from variables
          const template = `{{${variable + propPath}}}`;
          this.logger.info(`interpolate: ${template}, ${JSON.stringify(data)}`);
          const vResult = interpolate(template, data);
          return vResult;
        } catch (error) {
          this.logger.error(`Cannot interpolate variable: ${variable} ${propPath}`, error);
          return 'undefined';
        }
      })
      // 2. variable reference
      // matching & replacing: ${var}, $var, #{var}, #var
      // syntax: $var /format:list
      // shorthand: $var :list
      .replace(/[#$]\{?([a-zA-Z][\w_-]*)\}?(\s*[\/:][a-z:_-]+)?/g, (match, variable: string, format: string) => {
        const value = req.contexts[variable];
        // allow multiple spaces repeat in front of a format => so we must trim() it!
        format = (format || '').trim();
        if (format && /[/:]/.test(format.charAt(0))) {
          let vDirectiveName = format.substring(1);
          if (!/^format/.test(vDirectiveName)) {
            if (vDirectiveName.charAt(0) !== ':') {
              vDirectiveName = ':' + vDirectiveName;
            }
            // support shorthand $var /:list or $var :list
            vDirectiveName = 'format' + vDirectiveName;
          }
          this.logger.info('Directive /format: ' + vDirectiveName);
          if (this.directives.has(vDirectiveName)) {
            const vFormatTemplate = this.directives.get(vDirectiveName)?.value;
            const vResult = interpolate(vFormatTemplate, {
              [variable]: value,  // access via name of user variable, ex: $people
              value, // access via name: value
            });
            return vResult;
          }
        }
        return value || '';
      })
      // 3. number reference
      // matching & replacing: $123, $456
      .replace(/(\$\d*(?![\w\d]))/g, (match, variable) => {
        const value = req.contexts[variable];
        return value || '';
      });
  }

  /**
   * Response interpolation
   * @param text
   * @param req
   */
  interpolate(text: string, req: Request) {
    this.logger.debug('interpolate:', text);
    let output = this.interpolateDefinition(text);
    output = this.interpolateVariables(output, req);
    return output;
  }

  /**
   * Copy shadow data to botscript request
   * - Normalize human request
   * - Support scope variables, flows and context data
   * TODO: rename `newRequest()` to `createResponse()`
   * @param req
   */
  newRequest(req: Request)
    : Request {
    const request = new Request();
    request.enter(req.message);
    if (req.botId !== this.id) {
      // a new first-message request
      // or change new bot context => just reset
      this.logger.info('Human send the first-message request: ' + request.message);
      request.botId = this.id;
      return request;
    }

    let $flows = {};
    if (req.isFlowing) {
      $flows = req.$flows;
    }

    // keep state value persitence in dialogue flows (scope)
    const {
      prompt,
      isNotResponse,
      isFlowing,
      originalDialogue,
      currentDialogue,
      currentFlow,
      currentFlowIsResolved,
      variables,
      entities,
      flows,
      intent,
      missingFlows,
      previous,
      resolvedFlows,
      sessionId,
      botId,
    } = req;
    this.logger.info('Normalize human request: isFlowing=' + isFlowing, request.message);
    // transfer state to new request
    Object.assign(request, {
      prompt,
      isNotResponse,
      isFlowing,
      originalDialogue,
      currentDialogue,
      currentFlow,
      currentFlowIsResolved,
      variables,
      entities,
      flows,
      intent,
      missingFlows,
      previous,
      resolvedFlows,
      sessionId,
      botId,
      $flows,
    });

    return request;
  }
}
