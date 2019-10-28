import { TYPES } from './struct';
import { expect } from 'chai';

describe('Dialogue Parser', () => {
  it('contains trigger', async () => {
    expect(TYPES).contains('+');
  });
});
