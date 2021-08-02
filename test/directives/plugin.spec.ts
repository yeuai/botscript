import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Directive: /plugin', () => {

  describe('A simple plugin', async () => {
    const bot = new BotScript();

    bot.parse(`
    /plugin: test
    \`\`\`js
    req.variables.today = new Date().getDate();
    req.variables.day = new Date().getDay();

    # test 2
    req.variables.year = new Date().getFullYear();
    \`\`\`

    > test

    + howdy
    - Today is $today
    `);
    await bot.init();

    it('should load directive /plugin: test', async () => {
      // console.log(bot.context.directives);
      // console.log(bot.context.plugins);
      assert.isTrue(bot.context.directives.has('plugin:test'), 'contains directive /plugin');
    });

    it('should execute plugin and get value', async () => {
      const today = new Date().getDate();
      const req = new Request();
      // ask bot with data output format
      const res2 = await bot.handleAsync(req.enter('howdy'));
      assert.match(res2.speechResponse, /today is/i, 'bot response');
      assert.equal(res2.variables.today, today, 'today value number');
    });
  });

  describe('Support post-processing', async () => {
    const bot = new BotScript();

    bot.parse(`
    /plugin: testNoReply
    \`\`\`js
    req.variables.today = new Date().getDate();

    return (req, ctx) => {
      if (req.speechResponse === 'Hello') {
        req.speechResponse = 'Hello Human!';
      }
      if (req.isNotResponse) {
        req.speechResponse = 'I dont know!';
      }
    }
    \`\`\`

    > testNoReply

    + hello bot
    - Hello
    `);
    await bot.init();

    it('should load directive /plugin: testNoReply', async () => {
      assert.isTrue(bot.context.directives.has('plugin:testNoReply'), 'contains directive /plugin');
    });

    it('should execute plugin and get value', async () => {
      const today = new Date().getDate();
      const req = new Request();
      // ask bot with data output format
      const res1 = await bot.handleAsync(req.enter('hello bot'));
      assert.match(res1.speechResponse, /Hello Human!/i, 'bot response');
      assert.equal(res1.variables.today, today, 'today value number');
      // no reply
      const res2 = await bot.handleAsync(req.enter('something great'));
      assert.match(res2.speechResponse, /I dont know!/i, 'bot response');
      assert.equal(res2.variables.today, today, 'today value number');

    });
  });

});
