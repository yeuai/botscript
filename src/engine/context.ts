import { random } from '../lib/utils';
import { Request } from './request';
import { Struct } from './struct';
import { IActivator } from '../interfaces/activator';

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
  patterns: Map<string, { name: string, match: RegExp, func: (pattern: string) => RegExp | IActivator }>;

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.flows = new Map();
    this.commands = new Map();
    this.patterns = new Map();
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
      return list ? random(list.value) : defName;
    });
  }

  /**
   * Interpolate variables from request
   * @param text message response
   * @param req message request
   */
  interpolateVariables(text: string, req: Request) {
    return text.replace(/\$([a-z][\w_-]*)(\.[.\w[\]]*[\w\]])/g, (match, variable, output) => {
      const result = req.variables[variable];
      const value = result && result[output];
      return value || '';
    }).replace(/[#$]\{?([a-z][\w_-]*)\}?/g, (match, variable) => {
      const value = req.variables[variable];
      return value || '';
    }).replace(/(\$\d*(?![\w\d]))/g, (match, variable) => {
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
