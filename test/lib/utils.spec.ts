import { expect } from 'chai';
import { evaluate } from '../../src/lib/utils';

describe('Utils', () => {

  describe('safeEvalCode', () => {
    it('should return true when given boolean value', async () => {
      const result = evaluate(`true`, {});
      expect(result).eq(true);
    });

    it('should return true when given simple comparision', async () => {
      const result = evaluate(`$name == 'vunb' && $age == 20`, {name: 'vunb', age: 20});
      expect(result).eq(true);
    });

    it('should returns expression value', async () => {
      expect(evaluate(`1 + 2`, {})).eq(3);
      expect(evaluate(`process.exit(1)`, {})).eq(undefined);
    });
  });
});
