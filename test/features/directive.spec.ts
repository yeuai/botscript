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

  describe('Directive: include', async () => {
    it('should include scripts from url', async () => {
      const bot = new BotScript();
      bot.parse(`
      /include: https://raw.githubusercontent.com/yeuai/botscript/master/examples/hello.bot
      `);
      await bot.init();
      const req = await bot.handleAsync(new Request('Hello bot'));
      assert.match(req.speechResponse, /Hello, human!/i, 'bot reply');
    });
  });

  describe('Directive: format', () => {
    it('should format response with data', async () => {
      const bot = new BotScript();
      bot.parse(`
      @ list_patient https://raw.githubusercontent.com/yeuai/botscript/master/examples/data/list.json

      /format: list
      <ul>
      {{#each data}}
        <li>{{name}} / {{age}}<li>,
      {{/each}}
      </ul>

      + show my list
      * true @> list_patient
      - $data /format:list
      `);
      await bot.init();

      const vFormatDirective = bot.context.directives.get('format:list');
      const vNonExistsDirective = bot.context.directives.get('format: list');
      assert.isNotNull(vFormatDirective, 'Parsed directive format');
      assert.isUndefined(vNonExistsDirective, 'Get directive without name normalization');

      // ask bot with data output format
      const req = await bot.handleAsync(new Request('show my list'));
      assert.match(req.speechResponse, /^<ul>.*<\/ul>$/i, 'show formatted response');
    });
  });


});
