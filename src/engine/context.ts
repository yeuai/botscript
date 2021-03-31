import { random, newid } from '../lib/utils';
import { interpolate } from '../lib/template';
import { Request } from './request';
import { Struct } from './struct';
import { IActivator } from '../interfaces/activator';
import { Logger } from '../lib/logger';

const logger = new Logger('Context');

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

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.flows = new Map();
    this.commands = new Map();
    this.patterns = new Map();
    this.plugins = new Map();
    this.directives = new Map();
    this.idctx = newid();
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
    logger.debug('interpolateDefinition:', text);
    return text.replace(/\[([\w-]+)\]/g, (match, defName) => {
      const definition = defName.toLowerCase();
      if (!this.definitions.has(definition)) {
        // return original
        return match;
      }
      const list = this.definitions.get(definition) as Struct;
      return random(list.options);
    });
  }

  /**
   * Interpolate variables from request
   * @param text message response
   * @param req message request
   */
  interpolateVariables(text: string, req: Request) {
    logger.debug('interpolateVariables:', text);
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
            const vValue = req.variables[variable];
            Object.assign(data, { [variable]: vValue });
          }

          // interpolate value from variables
          const template = `{{${variable + propPath}}}`;
          logger.info(`interpolate: ${template}, ${JSON.stringify(data)}`);
          const vResult = interpolate(template, data);
          return vResult;
        } catch (error) {
          logger.error(`Cannot interpolate variable: ${variable} ${propPath}`, error);
          return 'undefined';
        }
      })
      // 2. variable reference
      // matching & replacing: ${var}, $var, #{var}, #var
      // syntax: $var /format:list
      // shorthand: $var :list
      .replace(/[#$]\{?([a-zA-Z][\w_-]*)\}?(\s*[\/:][a-z:_-]+)?/g, (match, variable: string, format: string) => {
        const value = req.variables[variable];
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
          logger.info('Directive /format: ' + vDirectiveName);
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
        const value = req.variables[variable];
        return value || '';
      });
  }

  /**
   * Response interpolation
   * @param text
   * @param req
   */
  interpolate(text: string, req: Request) {
    logger.debug('interpolate:', text);
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
      logger.info('Human send the first-message request: ' + request.message);
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
    logger.info('Normalize human request: isFlowing=' + isFlowing, request.message);
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
