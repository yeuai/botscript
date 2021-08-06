import { expect } from 'chai';
import { Context, Request } from '../../src/common';
import { VmRunner as VmRunnerBrowser } from '../../src/lib/vm';
import { VmRunner as VmRunnerNode } from '../../src/lib/vm2';
import { wrapCode as wrapCodeNode, wrapCodeBrowser } from '../../src/plugins/built-in';
import * as utils from '../../src/lib/utils';
import { Logger } from '../../src/lib/logger';

describe('VmRunner', () => {

  describe('VM for Browser', () => {
    it('should run the code', async () => {
      const vCode = wrapCodeBrowser(`logger.info('Ok'); return () => {req.message = 123}`);

      const req = new Request();
      const ctx = new Context();
      const logger = new Logger('TESTER');
      const vPreProcess = await VmRunnerBrowser.run(vCode, { req, ctx, utils, logger });
      const vPostProcessingCallback = await vPreProcess();
      expect(vPreProcess).not.eq(undefined);
      expect(req.message).not.eq(123);

      vPostProcessingCallback(req, ctx);
      expect(req.message).eq(123);
    });
  });

  describe('VM for Node', () => {
    it('should run the code', async () => {
      const vCode = wrapCodeNode(`logger.info('Ok'); return () => {req.message = 123}`);

      const req = new Request();
      const ctx = new Context();
      const logger = new Logger('TESTER');
      const vPreProcess = await VmRunnerNode.run(vCode, { req, ctx, utils, logger });
      const vPostProcessingCallback = await vPreProcess();
      expect(vPreProcess).not.eq(undefined);
      expect(req.message).not.eq(123);

      vPostProcessingCallback(req, ctx);
      expect(req.message).eq(123);
    });
  });
});
