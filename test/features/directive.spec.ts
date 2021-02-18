import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);
// Mock specific requests, but let unmatched ones through
mock
  .onGet('/api/nlu').reply(200, {
    intent: 'who',
    entities: [{ id: 1, name: 'John Smith' }],
  })
  .onGet('/api/nlu/react').reply(200, {
    intent: 'react_positive',
    entities: [{ id: 1, name: 'John Smith' }],
  })
  .onAny()
  .passThrough();

describe('Feature: Directive', () => {

  describe('Default NLU', () => {
    const bot = new BotScript();

    bot.parse(`
    > nlu

    @ nlu /api/nlu

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

    @ nlu /api/nlu/react

    + intent: react_positive
    - You are funny
    `);

    it('should detect intent by custom NLU (using directive)', async () => {
      const req = await bot.handleAsync(new Request('You are great'));
      assert.match(req.intent, /react_positive/i, 'intent');
      assert.match(req.speechResponse, /you are funny/i, 'bot reply');
    });
  });

  describe('should include scripts from url', async () => {
    it('should reply a greeting', async () => {
      const bot = new BotScript();
      bot.parse(`
      /include: https://raw.githubusercontent.com/yeuai/botscript/master/examples/hello.bot
      `);
      await bot.init();
      const req = await bot.handleAsync(new Request('Hello bot'));
      assert.match(req.speechResponse, /Hello, human!/i, 'bot reply');
    });
  });

});
