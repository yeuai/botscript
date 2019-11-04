import { BotMachine, BotScript, Request } from '../../src/engine';
import { expect, assert } from 'chai';

const INPUT_TEXT = 'I would like to buy 10 tickets';

describe('Machine', () => {

  const bot = new BotScript();
  bot.parse(`
~ age
- How old are you?
+ I am #{age}
+ #{age}

+ my name is *{name}
~ age
- Hello $name, you are $age!

+ hello bot
- Hello human!
  `);
  const machine = new BotMachine();

  describe('basic reply', () => {
    it('respond a message to human', async () => {
      const req = new Request('hello bot');
      machine.resolve(req, bot.context);
      const reply = req.speechResponse;
      assert.match(reply, /hello human/i, 'bot reply human');
    });
  });

  describe('resolve a basic dialogue flows', () => {
    it('bot should ask human age', async () => {
      const req = new Request('My name is Vu');
      machine.resolve(req, bot.context);
      const reply = req.speechResponse;
      assert.match(reply, /how old are you/i, 'bot ask human\'s age');
    });

    it('bot respond a greet with human name and age', async () => {
      const req = new Request('20');
      machine.resolve(req, bot.context);
      const reply = req.speechResponse;
      assert.match(reply, /hello/i, 'bot send a greeting');
      assert.equal(req.variables.name, 'Vu', 'human name');
      assert.equal(req.variables.age, '20', 'human age');
    });
  });

  describe('no reply', () => {
    it('should respond no reply!', async () => {
      const req = new Request('sfdsfi!');
      machine.resolve(req, bot.context);
      const reply = req.speechResponse;
      assert.match(reply, /no reply/i, 'bot no reply');
    });
  });
});
