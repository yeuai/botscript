import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Dialogue: sorted activator before reply', () => {
  // TODO: implement

  const bot = new BotScript();
  let request = new Request();

  bot.parse(`
    + today ok
    - hello

    + today *
    - reply me!
    `);

  it('bot should reply me', async () => {
    const req = request.enter('today ok');
    const reply = await bot.handleAsync(req);
    assert.equal(reply.speechResponse, 'reply me!', 'bot reply');
  });


})
