import { random } from '../lib/utils';
import { Request } from './request';
import { Struct } from './struct';

/**
 * Bot context
 */
export class Context {

  definitions: Map<string, Struct>;
  dialogues: Map<string, Struct>;
  commands: Map<string, Struct>;
  // TODO: remove `questions`, it should be a definition form
  questions: Map<string, Struct>;
  // TODO: remove `flows`, it should be directives within dialogue
  flows: Map<string, Struct>;
  // TODO: remove `variables`, it should attach within msg request
  variables: Map<string, Struct>;
  // TODO: remove `patterns`, it should be resolved automatically in dialogue trigger
  patterns: Map<string, Struct>;

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.flows = new Map();
    this.commands = new Map();
    this.questions = new Map();
    this.variables = new Map();
    this.patterns = new Map();
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
      const result = req.parameters[variable];
      const value = result && result[output];
      return value || '';
    }).replace(/[#$]\{?([a-z][\w_-]*)\}?/g, (match, variable) => {
      const value = req.parameters[variable];
      return value || '';
    }).replace(/(\$\d*(?![\w\d]))/g, (match, variable) => {
      const value = req.parameters[variable];
      return value || '';
    });
  }

  /**
   * Response interpolation
   * @param text
   * @param req
   */
  interpolate(text: string, req: Request) {
    throw new Error('Not implement');
  }
}
