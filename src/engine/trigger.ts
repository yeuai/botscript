/**
 * Dialogue trigger
 */
export class Trigger {
  // dialogue id
  dialog: string;
  pattern: string;

  isAtomic: boolean;
  hasWildcards: boolean;
  countWords: number;
  countWildcards: number;

  public static sorter(a: Trigger, b: Trigger): number {
    if (a.isAtomic && b.isAtomic) {

    }

    if (a.isAtomic) {
      return 1;
    } else if (b.isAtomic) {
      return -1;
    } else {

    }

    return 1;
  }
}
