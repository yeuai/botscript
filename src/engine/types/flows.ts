import { Struct } from '../struct';

/**
 * Flows struct
 */
export class Flows extends Struct {

  flows: string[];

  constructor(content: string | Struct) {
    if (typeof content === 'string') {
      super(content);
    } else {
      super(content.content);
    }

    // Get flows options
    this.flows = this.body.filter(x => /^~/.test(x)).map(x => x.replace(/^\s*~\s*/, ''));
  }

}
