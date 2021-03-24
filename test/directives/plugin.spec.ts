import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Directive: /plugin', () => {

  describe('Default NLU', async () => {
    const bot = new BotScript();

    bot.parse(`
    /plugin: test
    \`\`\`js
    req.variables.today = new Date().getDate();
    req.variables.day = new Date().getDay();

    // test 2
    req.variables.year = new Date().getFullYear();
    \`\`\`
    `);
    await bot.init();

    it('should load directive /plugin', async () => {
      console.log(bot.context.directives);
      assert.isTrue(bot.context.directives.has('plugin:test'), 'contains directive /plugin');
    });
  });

});
