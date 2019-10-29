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
}
