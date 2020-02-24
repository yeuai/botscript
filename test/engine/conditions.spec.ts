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

});
