import { BotScript, Request } from '../../src/engine';
import { assert } from 'chai';

describe('Plugin', () => {

  describe('(built-in)', () => {

    const botPlugin = new BotScript();

    botPlugin.parse(`
    > addTimeNow
    > noReplyHandle
    * true

    ~ name
    - what is your name?
    + my name is *{name}

    + what is my name
    ~ name
    - your name is $name

    + what time is it
    - it is $time
    `);

    it('should ask time now', async () => {
      const now = new Date();
      const req = new Request('what time is it');
      const time = `${now.getHours()}:${now.getMinutes()}`;

      const res = await botPlugin.handleAsync(req);
      assert.equal(res.variables.time, time, 'respond time in format HH:mm');
    });

    it('should respond not understand', async () => {
      const req = new Request('how is it today');

      const res = await botPlugin.handleAsync(req);
      assert.match(res.speechResponse, /i don't understand/i);
    });

    it('should ask human again if dialog is in the flow', async () => {
      let flowsReq = new Request();

      flowsReq = await botPlugin.handleAsync(flowsReq.enter('what is my name'));
      assert.match(flowsReq.speechResponse, /what is your name/i);

      flowsReq = await botPlugin.handleAsync(flowsReq.enter('what?'));
      assert.match(flowsReq.speechResponse, /what is your name/i);

    });

  });

  describe('(extend)', () => {

    const botPlugin = new BotScript();
    botPlugin
      .parse(`
      ! name Alice

      > human name

      > other preprocess

      > unknow plugin

      + what is your name
      - my name is [name]

      + what is my name
      - my name is $name
      `)
      .plugin('human name', async (req, ctx) => {
        req.variables.name = 'Bob';
        req.variables.intent = 'ask name';
      });

    it('should know human name', async () => {
      let req = new Request('what is your name?');

      req = await botPlugin.handleAsync(req);
      assert.match(req.speechResponse, /my name is alice/i, 'ask bot name');
      assert.match(req.variables.intent, /ask name/i, 'async plugin');
    });

  });

});
