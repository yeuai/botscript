import { expect } from 'chai';
import { TYPES } from 'engine/parser';

describe('Dialogue Parser', () => {

  describe('Parser', () => {
    it('Contains trigger', async () => {
      expect(TYPES).contains('+');
    });
  });
});
