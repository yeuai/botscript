import { expect } from 'chai';
import { interpolate } from '../../src/lib/template';

describe('Lib: Template', () => {

  describe('Interpolate', () => {
    it('should interpolate template with data', async () => {
      const param = 'vunb';
      const result = interpolate(`/api/url?query={{param}}`, {param});
      expect(result).eq('/api/url?query=vunb');
    });
  });
});
