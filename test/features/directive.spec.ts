import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Feature: Directive', () => {

  describe('Default NLU', () => {
    const bot = new BotScript();

    bot.parse(`
    > nlu

    + intent: who
    - You are genius
    `);

    it('should detect intent by default NLU', async () => {
      const req = await bot.handleAsync(new Request('tôi là ai'));
      assert.match(req.intent, /who/i, 'intent');
      assert.match(req.speechResponse, /you are genius/i, 'bot reply');
    });
  });

  describe('Custom NLU by using Directive', () => {
    const bot = new BotScript();
    bot.parse(`
    > nlu

    /nlu: https://nlu.api-server.com/test

    + intent: react_positive
    - You are funny
    `);

    it('should detect intent by custom NLU (using directive)', async () => {
      const req = await bot.handleAsync(new Request('You are great'));
      assert.match(req.intent, /react_positive/i, 'intent');
      assert.match(req.speechResponse, /you are funny/i, 'bot reply');
    });
  });

  describe('Include scripts by using Directive', () => {
    const bot = new BotScript();
    bot.parse(`
    /include: https://raw.githubusercontent.com/yeuai/botscript/master/examples/hello.bot
    `);

    it('should detect intent by custom NLU (using directive)', async () => {
      const req = await bot.handleAsync(new Request('Hello bot'));
      assert.match(req.speechResponse, /Hello, human!/i, 'bot reply');
    });
  });

});
