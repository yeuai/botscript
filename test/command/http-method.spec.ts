import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Command: http method', () => {

  it('should support put, delete method', async () => {
    const bot = new BotScript();

    bot.parse(`
    @ service1 put /api/http/put

    @ service2 delete /api/http/delete

    + put me
    * true @> service1
    - Result $message

    + delete me
    * true @> service2
    - Result $message2
    `);
    await bot.init();

    const req = new Request();
    let res = await bot.handleAsync(req.enter('put me'));
    assert.match(res.speechResponse, /result ok/i, 'bot response with command executed');

    res = await bot.handleAsync(req.enter('delete me'));
    assert.match(res.speechResponse, /result ok/i, 'bot response with command executed');
  });

});
