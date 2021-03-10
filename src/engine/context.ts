import { compile } from 'handlebars';
import { random } from '../lib/utils';
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

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.flows = new Map();
    this.commands = new Map();
    this.patterns = new Map();
    this.plugins = new Map();
    this.directives = new Map();
  }

  /**
   * Get bot id from definition
   */
  get id(): string {
    return this.definitions.has('botid')
      ? (this.definitions.get('botid') as Struct).value
      : '';
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
    return text.replace(/\[([\w-]+)\]/g, (match, defName) => {
      const list = this.definitions.get(defName.toLowerCase());
      return list ? random(list.options) : defName;
    });
  }

  /**
   * Interpolate variables from request
   * @param text message response
   * @param req message request
   */
  interpolateVariables(text: string, req: Request) {
    return text
      // matching & replacing: $var.a.b[0].c (note: a.b[0].c is a path of property)
      .replace(/\$([a-z][\w_-]*)(\.[.\w[\]]*[\w\]])/g, (match, variable, propPath) => {
        try {
          // TODO: using Proxy or npm:path-value
          const result = req.variables[variable];
          // tslint:disable-next-line: no-eval
          const value = eval(`result${propPath}`);
          return value || '';
        } catch (error) {
          logger.error(`Cannot interpolate variable: ${variable} ${propPath}`, error);
          return 'undefined';
        }
      })
      // matching & replacing: ${var}, $var, #{var}, #var
      // syntax: $var /format:list
      // shorthand: $var :list
      .replace(/[#$]\{?([a-z][\w_-]*)\}?\s*([\/:][a-z:_-]+)?/g, (match, variable: string, format: string) => {
        const value = req.variables[variable];
        if (format && /[/:]/.test(format.charAt(0))) {
          let vDirectiveName = format.substring(1);
          if (!/^format/.test(vDirectiveName)) {
            if (vDirectiveName.charAt(0) !== ':') {
              vDirectiveName = ':' + vDirectiveName;
            }
            // support shorthand $var /:list or $var :list
            vDirectiveName = 'format' + vDirectiveName;
          }
          // console.log('Directive format: ' + vDirectiveName);
          if (this.directives.has(vDirectiveName)) {
            const vFormatTemplate = this.directives.get(vDirectiveName)?.value;
            const vTemplate = compile(vFormatTemplate);
            const vResult = vTemplate({
              [variable]: value,  // access via name of user variable, ex: $people
              value, // access via name: value
            });
            return vResult;
          }
        }
        return value || '';
      })
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
    let output = this.interpolateDefinition(text);
    output = this.interpolateVariables(output, req);
    return output;
  }
}
