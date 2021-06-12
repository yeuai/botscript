import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Dialogue: sorted activator before reply', () => {
  // TODO: implement

  const bot = new BotScript();
  let request = new Request();

  bot.parse(`
    + today ok
    - hello 1

    + today okk
    - hello 2

    + today *
    - reply me!
    `);

  it('bot should say hello 2', async () => {
    const req = request.enter('today okk');
    const reply = await bot.handleAsync(req);
    assert.equal(reply.speechResponse, 'hello 2', 'bot reply');
  });

  it('bot should say hello 1', async () => {
    const req = request.enter('today ok');
    const reply = await bot.handleAsync(req);
    assert.equal(reply.speechResponse, 'hello 1', 'bot reply');
  });

  it('bot should say reply me!', async () => {
    const req = request.enter('today okkk');
    const reply = await bot.handleAsync(req);
    assert.equal(reply.speechResponse, 'reply me!', 'bot reply');
  });

})
