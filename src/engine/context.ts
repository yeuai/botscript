import { random } from '../lib/utils';
import { Request } from './request';

/**
 * Bot context
 */
export class Context {

  definitions: Map<string, any>;
  dialogues: Map<string, any>;
  dialogflows: Map<string, any>;
  commands: Map<string, any>;
  questions: Map<string, any>;
   // TODO: remove `variables`, it should attach within msg request
  variables: Map<string, any>;
  patterns: Map<string, any>;

  constructor() {
    this.definitions = new Map();
    this.dialogues = new Map();
    this.dialogflows = new Map();
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
