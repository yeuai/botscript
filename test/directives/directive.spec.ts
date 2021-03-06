import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

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
      @ list_patient /api/data/list

      /format: list
      <ul>
      {{#each people}}
        <li>{{name}} / {{age}}</li>,
      {{/each}}
      </ul>

      + show my list
      * true @> list_patient
      - $people /format:list

      + shorthand format
      * true @> list_patient
      - $people :list
      `);
      await bot.init();

      const vFormatDirective = bot.context.directives.get('format:list');
      const vNonExistsDirective = bot.context.directives.get('format: list');
      assert.isNotNull(vFormatDirective, 'Parsed directive format');
      assert.isUndefined(vNonExistsDirective, 'Get directive without name normalization');

      // ask bot with data output format
      const req = await bot.handleAsync(new Request('show my list'));
      // response with formmated data
      assert.match(req.speechResponse, /^<ul>.*<\/ul>$/i, 'show formatted response');
      // console.log('Speech response: ', req.speechResponse);
      // response with template engine (current support handlebars)
      const vOccurs = req.speechResponse.split('<li>').length;
      assert.equal(vOccurs - 1, 3, 'generated data with template');

      // ask bot with data output format
      const res2 = await bot.handleAsync(new Request('shorthand format'));
      // console.log('Output: ', res2.speechResponse);
      assert.equal(res2.speechResponse.split('<li>').length - 1, 3, 'shorthand format');
    });

    it('should format variable via common name: value or $var', async () => {
      const bot = new BotScript();
      bot.parse(`
      /format: bold
      <strong>{{value}}</strong><em>{{me}}</em>

      + bold *{me}
      - $me :bold
      `);
      await bot.init();

      // ask bot with data output format
      const res2 = await bot.handleAsync(new Request('bold vunb'));
      assert.equal(res2.speechResponse, '<strong>vunb</strong><em>vunb</em>', 'format bold');
    });
  });

});
