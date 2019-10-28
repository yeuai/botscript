/**
 * Bot context
 */
export class Context {

  dialogues: Map<any, any>;
  definitions: Map<any, any>;
  commands: Map<any, any>;
  variables: Map<any, any>;
  dialogflows: Map<any, any>;
  patterns: Map<any, any>;

  constructor() {
    this.dialogues = new Map();
    this.definitions = new Map();
    this.commands = new Map();
    this.variables = new Map();
    this.dialogflows = new Map();
    this.patterns = new Map();
  }
}
