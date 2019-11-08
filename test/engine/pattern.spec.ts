import { execPattern, transform, Context } from '../../src/engine';
import { expect, assert } from 'chai';

const INPUT_TEXT = 'I would like to buy 10 tickets';

describe('Pattern', () => {

  describe('RegEx Syntax', () => {
    it('should match a part of sentence', async () => {
      const pattern = transform('like', new Context(), false);
      assert.instanceOf(pattern, RegExp);
      assert.isTrue(pattern.test(INPUT_TEXT));
    });

    it('should match a named variable', async () => {
      const pattern = transform('/^I would (?<verb>.+) to/', new Context(), false);
      assert.isTrue(pattern.test(INPUT_TEXT));
      const captures = execPattern(INPUT_TEXT, pattern);
      assert.deepEqual(captures, {
        $1: 'like',
        verb: 'like',
      });
    });

    it('should captures intent and entities', async () => {
      const pattern = transform('/^I (.*) to (?<verb>.+) (\\d+) (?<what>.*)/', new Context(), false);
      assert.isTrue(pattern.test(INPUT_TEXT));
      const captures = execPattern(INPUT_TEXT, pattern);
      assert.deepEqual(captures, {
        $1: 'would like',
        $2: 'buy',
        $3: '10',
        $4: 'tickets',
        verb: 'buy',
        what: 'tickets',
      });
    });
  });

  describe('BotScript Syntax', () => {
    it('should match exact same sentence', async () => {
      const pattern = transform(INPUT_TEXT, new Context(), false);
      assert.isTrue(pattern.test(INPUT_TEXT));
    });

    it('should not match part of sentence', async () => {
      const pattern = transform('wou', new Context(), false);
      assert.isFalse(pattern.test(INPUT_TEXT));
    });

    it('should match star wildcard', async () => {
      const pattern = transform('I would like *', new Context(), false);
      assert.isTrue(pattern.test(INPUT_TEXT));

      const captures = execPattern(INPUT_TEXT, pattern);
      assert.deepEqual(captures, {
        $1: 'to buy 10 tickets',
      });
    });

    it('should match number wildcard', async () => {
      const pattern = transform('buy # tickets', new Context(), false);
      assert.isTrue(pattern.test(INPUT_TEXT));

      const captures = execPattern(INPUT_TEXT, pattern);
      assert.deepEqual(captures, {
        $1: '10',
      });
    });

  });

});
