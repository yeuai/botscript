import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Population: Variable $Titlecase', () => {

  it('should distinguish uppercase or lowercase', async () => {
    const bot = new BotScript();

    bot.parse(`
    @ service1 put /api/http/put

    + put me
    * true @> service1
    - Result $message $Titlecase
    `);
    await bot.init();

    const req = new Request();
    const res = await bot.handleAsync(req.enter('put me'));
    assert.equal(res.speechResponse, 'Result Ok NewVar', 'bot response with command executed and distinguish common case');
  });

});
