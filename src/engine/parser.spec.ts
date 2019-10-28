import { TYPES } from './machine';
import { expect } from 'chai';

describe('Dialogue Parser', () => {
  it('contains trigger', async () => {
    expect(TYPES).contains('+');
  });
});
