import { Struct } from '../struct';

/**
 * Question struct
 */
export class Question extends Struct {

  constructor(content: string) {
    super(content);

    // candidate options
    this.options = this.body.map(x => x.replace(/^\s*-\s*/, ''));
  }

}
