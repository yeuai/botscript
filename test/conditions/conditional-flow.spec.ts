import { BotScript, Request } from '../../src/engine';
import { assert } from 'chai';

describe('conditional flow', () => {

  const bot = new BotScript();
  bot.parse(`
    ~ ask topic
    - What topic do you want to ask?
    + *{topic}

    ~ ask item
    - What do you want to buy
    + I want to buy *{item}
    + *{item}

    # conditional flows
    + i want to ask
    * $flows.topic == 'buy phone' ~> ask item
    * $flows.done && $flows.count == 2 -> You selected: $flows.item
    ~ ask topic
    - I dont know topic: $topic
    `);

  it('should handle conditional flows', async () => {
    let req: Request;
    req = await bot.handleAsync(bot.newRequest('i want to ask'));
    assert.equal(req.speechResponse, 'What topic do you want to ask?', 'bot ask topic');
    assert.equal(req.currentFlow, 'ask topic');

    req = await bot.handleAsync(bot.newRequest('buy phone'));
    assert.match(req.speechResponse, /what do you want to buy/i);
    assert.equal(req.currentFlow, 'ask item');

    req = await bot.handleAsync(bot.newRequest('apple'));
    assert.match(req.speechResponse, /You selected: apple/i);
    assert.equal(req.currentFlow, undefined);

  });

  it('should handle conditional reply', async () => {
    let req: Request;
    // TODO: forgot last request $flows
    // bot.lastRequest = undefined;
    req = await bot.handleAsync(bot.newRequest('i want to ask'));
    assert.equal(req.speechResponse, 'What topic do you want to ask?', 'bot ask topic');
    assert.equal(req.currentFlow, 'ask topic');

    req = await bot.handleAsync(bot.newRequest('buy ticket'));
    assert.match(req.speechResponse, /I dont know topic/i);
    assert.equal(req.currentFlow, undefined);
  });

});
