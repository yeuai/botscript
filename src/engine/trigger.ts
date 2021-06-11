import { IActivator } from '../interfaces/activator';
import { Logger } from '../lib/logger';
import { wordsCount } from '../lib/word-count';

const logger = new Logger('Trigger');

/**
 * Dialogue trigger
 */
export class Trigger {
  // dialogue id
  dialog: string;
  original: string;
  source: string; // translated original
  pattern: RegExp | IActivator;
  hasWildcards: boolean;

  constructor(pattern: string = '', id?: string) {
    this.original = pattern;
    this.source = pattern;
    this.dialog = id || '';
  }

  /**
   * atomic pattern
   */
  get isAtomic(): boolean {
    return this.original === this.source;
  }

  /**
   * Get words count
   */
  get countWords(): number {
    return wordsCount(this.source);
  }
  countWildcards: number;

  /**
   * Trigger sorter
   * @param a
   * @param b
   * @returns
   */
  public static sorter(a: Trigger, b: Trigger): number {
    if (a.isAtomic && b.isAtomic) {
      const aWords = a.countWords;
      const bWords = b.countWords;
      if (aWords === bWords) {
        // sắp xếp theo thứ tự alphabet
        logger.debug('a & b is atomic!');
        if (b.source > a.source) {
          return 1;
        }
        return b.source < a.source ? -1 : 0;
      } else if (bWords > aWords) {
        return 1;
      } else {
        return bWords < aWords ? -1 : 0;
      }
    } else if (a.isAtomic) {
      logger.debug('a is atomic!');
      return -1;
    } else if (b.isAtomic) {
      logger.debug('b is atomic!');
      return 1;
    } else {
      // Both of a & b is not atomic
      // TODO: Improve
      logger.debug('a & b is not atomic!');
      return b.source.length - a.source.length;
    }
  }

  toString() {
    return this.source;
  }
}
