import { BotScript, Request } from '../../src/engine';
import { assert } from 'chai';

describe('BotScript: Conditional dialogue', () => {

  const bot = new BotScript();

  bot.parse(`
  + hello*
  * $name != null -> Are you $name?
  - Hello, human!
  - hi

  + my name is *{name}
  * $name == 'vunb' => Hello my boss!
  * $name == 'boss' => - I know you!
  - hello $name
  `);

  describe('basic condition', () => {
    it('respond NO REPLY!', async () => {
      const req = new Request();
      await bot.handleAsync(req.enter('my name is bob'));
      assert.match(req.speechResponse, /hello bob/i);

      await bot.handleAsync(req.enter('hello'));
      assert.match(req.speechResponse, /are you bob/i);

      await bot.handleAsync(req.enter('something'));
      assert.match(req.speechResponse, /NO REPLY/i);
    });
  });

  describe('Syntax: * expresssion => action', () => {
    it('a reply', async () => {
      const req = new Request();
      await bot.handleAsync(req.enter('my name is vunb'));
      assert.match(req.speechResponse, /hello my boss/i);

      await bot.handleAsync(req.enter('my name is boss'));
      assert.match(req.speechResponse, /i know you/i);
    });
  });

});
