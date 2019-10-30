import { Struct } from '../struct';

/**
 * Flows struct
 */
export class Flows extends Struct {

  constructor(content: string) {
    super(content);

    // Get flows options
    this.options = this.body.filter(x => /^~/.test(x)).map(x => x.replace(/^\s*~\s*/, ''));
  }

}
