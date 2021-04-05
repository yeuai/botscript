import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('Dialogue: flow', () => {

  describe('basic flows', () => {
    const bot = new BotScript();
    let flowsRequest = new Request();

    bot.parse(`
    ~ age
    - How old are you?
    + I am #{age}
    + #{age}

    ~ email
    - What is your email
    + My email is *{email}

    + my name is *{name}
    + *{name} is my name
    ~ age
    ~ email
    - Hello $name, you are $flows.age and email $flows.email!
    `);

    it('bot should ask human age', async () => {
      const req = flowsRequest.enter('My name is Vu');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'enter dialogue flows!');
      assert.match(flowsRequest.speechResponse, /how old are you/i, 'bot ask human\'s age');
    });

    it('bot should prompt again', async () => {
      const req = flowsRequest.enter('something');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'still in dialogue flows!');
      assert.match(flowsRequest.speechResponse, /how old are you/i, 'prompt one again');
    });

    it('bot should ask human email', async () => {
      const req = flowsRequest.enter('20');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'still in dialogue flows!');
      assert.equal(flowsRequest.variables.name, 'Vu', 'human name');
      assert.equal(flowsRequest.variables.age, '20', 'human age');
      assert.match(flowsRequest.speechResponse, /What is your email/i, 'bot send a next question');
    });

    it('bot should respond a greet with human name, age and email', async () => {
      const req = flowsRequest.enter('my email is vunb@example.com');
      flowsRequest = await bot.handleAsync(req);
      assert.isFalse(flowsRequest.isFlowing, 'exits dialogue flows!');
      assert.equal(flowsRequest.variables.name, 'Vu', 'human name');
      // variable: v1.x (not clean after flow is resolved)
      // assert.equal(flowsRequest.variables.age, '20', 'human age');
      // assert.equal(flowsRequest.variables.email, 'vunb@example.com', 'human email');
      // scope: $flow from v1.7.x
      assert.equal(flowsRequest.$flows.age, '20', 'human age');
      assert.equal(flowsRequest.$flows.email, 'vunb@example.com', 'human email');
      assert.match(flowsRequest.speechResponse, /hello/i, 'bot send a greeting');
    });
  });

  describe('Context flows', () => {

    const bot = new BotScript();
    let flowsRequest = new Request();

    bot.parse(`
    ~ ask_age
    - How old are you?
    + I am #{age}
    + #{age}

    ~ ask_email
    - What is your email
    + My email is *{email}

    ~ ask_name
    - Hello, what is your name?
    + My name is *{name}

    + hello
    ~ ask_name
    ~ ask_age
    ~ ask_email
    - Hello $flows.name, you are $flows.age and email $flows.email!
    `);

    it('bot should ask human name', async () => {
      const req = flowsRequest.enter('hello');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'enter dialogue flows!');
      assert.match(flowsRequest.speechResponse, /Hello, what is your name/i, 'bot ask human\'s age');
    });

    it('bot should prompt age', async () => {
      const req = flowsRequest.enter('My name is Vu');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'still in dialogue flows!');
      assert.match(flowsRequest.speechResponse, /how old are you/i, 'prompt one again');
    });

    it('bot should ask human email', async () => {
      const req = flowsRequest.enter('20');
      flowsRequest = await bot.handleAsync(req);
      assert.isTrue(flowsRequest.isFlowing, 'still in dialogue flows!');
      assert.equal(flowsRequest.variables.name, 'Vu', 'human name');
      assert.equal(flowsRequest.variables.age, '20', 'human age');
      assert.match(flowsRequest.speechResponse, /What is your email/i, 'bot send a next question');
    });

    it('bot should respond a greet with human name, age and email', async () => {
      const req = flowsRequest.enter('my email is vunb@example.com');
      flowsRequest = await bot.handleAsync(req);
      assert.isFalse(flowsRequest.isFlowing, 'exit dialogue flows!');
      // variable: v1.x (not clean after flow is resolved)
      // assert.equal(flowsRequest.variables.name, 'Vu', 'human name');
      // scope: $flow v1.7+
      assert.equal(flowsRequest.$flows.age, '20', 'human age');
      assert.equal(flowsRequest.$flows.email, 'vunb@example.com', 'human email');
      assert.equal(flowsRequest.speechResponse, 'Hello Vu, you are 20 and email vunb@example.com!', 'bot reply a greeting');
    });
  });

});
