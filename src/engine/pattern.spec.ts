import { execPattern, transform } from './pattern';
import { expect, assert } from 'chai';

const INPUT_TEXT = 'I would like to buy 10 tickets';

describe('Pattern', () => {
  it('should match a part of sentence', async () => {
    const pattern = transform('like', new Map(), false);
    assert.match(INPUT_TEXT, pattern);
  });

  it('should match a named variable', async () => {
    const pattern = transform('/^I would (?<verb>.+) to/', new Map(), false);
    assert.match(INPUT_TEXT, pattern);
    const captures = execPattern(INPUT_TEXT, pattern);
    assert.deepEqual(captures, {
      $1: 'like',
      verb: 'like',
    });
  });

  it('should captures intent and entities', async () => {
    const pattern = transform('/^I (.*) to (?<verb>.+) (\\d+) (?<what>.*)/', new Map(), false);
    assert.match(INPUT_TEXT, pattern);
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
