// tslint:disable: jsdoc-format
import { Request } from '../engine';
import clean from './utils/clean';

/**
 * Task: Processes input and tries to make it consumable for a bot
 * 1. spelling corrections for common spelling errors
 * 2. idiom conversions
 * 3. junk word removal from sentence
 * 5. special sentence effects (question, exclamation, revert question)
 * 6. abbreviation expansion and canonization
 */
export function normalize(req: Request) {
  req.message = clean.all(req.message).replace(/[+-?!.,]+$/, '');
}
