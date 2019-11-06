import { BotMachine, BotScript, Request } from '../../src/engine';
import { expect, assert } from 'chai';

describe('Machine', () => {

  const bot = new BotScript();
  bot.parse(`
~ age
- How old are you?
+ I am #{age}
+ #{age}

+ my name is *{name}
+ *{name} is my name
~ age
- Hello $name, you are $age!

+ hello bot
- Hello human!
  `);
  const machine = new BotMachine();
  const reqContext = new Request();

  describe('basic reply', () => {
    it('respond a message to human', async () => {
      const req = new Request('hello bot');
      bot.handle(req);
      const reply = req.speechResponse;
      assert.match(reply, /hello human/i, 'bot reply human');
    });
  });

  describe('resolve a basic dialogue flows', () => {
    it('bot should ask human age', async () => {
      const req = reqContext.enter('My name is Vu');
      bot.handle(req);
      const reply = req.speechResponse;
      assert.isTrue(req.isFlowing, 'enter dialogue flows!');
      assert.match(reply, /how old are you/i, 'bot ask human\'s age');
    });

    it('bot should prompt again', async () => {
      const req = reqContext.enter('something');
      bot.handle(req);
      const reply = req.speechResponse;
      assert.isTrue(req.isFlowing, 'still in dialogue flows!');
      assert.match(reply, /how old are you/i, 'prompt one again');
    });

    it('bot respond a greet with human name and age', async () => {
      const req = reqContext.enter('20');
      bot.handle(req);
      const reply = req.speechResponse;
      assert.isFalse(req.isFlowing, 'exit dialogue flows!');
      assert.match(reply, /hello/i, 'bot send a greeting');
      assert.equal(req.variables.name, 'Vu', 'human name');
      assert.equal(req.variables.age, '20', 'human age');
    });
  });

  describe('no reply', () => {
    it('should respond no reply!', async () => {
      const req = new Request('sfdsfi!');
      bot.handle(req);
      const reply = req.speechResponse;
      assert.match(reply, /no reply/i, 'bot no reply');
    });
  });
});
