import { BotScript, Request } from '../../src/engine';
import { assert } from 'chai';

describe('BotScript', () => {

  const bot = new BotScript();
  const flowsRequest = new Request();

  bot.parse(`
  ! name BotScript

  + hello bot
  - Hello human!

  + what is your name
  - My name is [name]

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
  - Hello $name, you are $age and email $email!

  `);

  describe('basic reply', () => {
    it('respond a message to human', async () => {
      const req = new Request('hello bot');
      bot.handle(req);
      assert.match(req.speechResponse, /hello human/i, 'bot reply human');
    });

    it('should reply with definition', async () => {
      const req = new Request('what is your name');
      bot.handle(req);
      assert.match(req.speechResponse, /my name is botscript/i, 'bot shows his name');
    });
  });

  describe('basic dialogue flows', () => {
    it('bot should ask human age', async () => {
      const req = flowsRequest.enter('My name is Vu');
      bot.handle(req);
      assert.isTrue(req.isFlowing, 'enter dialogue flows!');
      assert.match(req.speechResponse, /how old are you/i, 'bot ask human\'s age');
    });

    it('bot should prompt again', async () => {
      const req = flowsRequest.enter('something');
      bot.handle(req);
      assert.isTrue(req.isFlowing, 'still in dialogue flows!');
      assert.match(req.speechResponse, /how old are you/i, 'prompt one again');
    });

    it('bot should ask human email', async () => {
      const req = flowsRequest.enter('20');
      bot.handle(req);
      assert.isTrue(req.isFlowing, 'still in dialogue flows!');
      assert.equal(req.variables.name, 'Vu', 'human name');
      assert.equal(req.variables.age, '20', 'human age');
      assert.match(req.speechResponse, /What is your email/i, 'bot send a next question');
    });

    it('bot should respond a greet with human name, age and email', async () => {
      const req = flowsRequest.enter('my email is vunb@example.com');
      bot.handle(req);
      assert.isFalse(req.isFlowing, 'exit dialogue flows!');
      assert.equal(req.variables.name, 'Vu', 'human name');
      assert.equal(req.variables.age, '20', 'human age');
      assert.equal(req.variables.email, 'vunb@example.com', 'human email');
      assert.match(req.speechResponse, /hello/i, 'bot send a greeting');
    });
  });

  describe('no reply', () => {
    it('should respond no reply!', async () => {
      const req = new Request('sfdsfi!');
      bot.handle(req);
      assert.match(req.speechResponse, /no reply/i, 'bot no reply');
    });
  });

  describe('add custom pattern', () => {
    // tslint:disable-next-line: no-shadowed-variable
    const bot = new BotScript();
    bot.parse(`
    + ([{ tag:VB }]) [{ word:you }]
    - So you want to $1 me, huh?

    + %[intent]
    - You are genius!
    `);
    bot
      .addPatternCapability({
        name: 'TokensRegex',
        match: /\[\s*\{\s*(?:word|tag|lemma|ner|normalized):/i,
        func: (pattern) => ({
          source: pattern,
          test: (input) => /love/.test(input),
          exec: (input) => [input, 'love'],
          toString: () => pattern,
        }),
      })
      .addPatternCapability({
        name: 'Intent detection',
        match: /^\%\[\s*(?:intent|ner)\s*\]$/i,
        func: (pattern) => ({
          source: pattern,
          test: (input) => /buy/i.test(input),
          exec: (input) => [input, 'something'],
          toString: () => pattern,
        }),
      });

    it('should support TokensRegex', async () => {
      const req = bot.handle(new Request('love you'));
      assert.match(req.speechResponse, /you want to love/i, 'bot reply');
    });

    it('should support custom pattern', async () => {
      const req = bot.handle(new Request('buy something'));
      assert.match(req.speechResponse, /you are genius/i, 'bot reply');
    });
  });

  describe('conditional dialogues', () => {
    const condFlowBot = new BotScript();
    condFlowBot.parse(`
    ~ ask topic
    - What topic do you want to ask?
    + *{topic}

    ~ buy phone
    - What do you want to buy
    + I want to buy *{item}
    + *{item}

    @ geoip https://api.ipify.org/?format=json
    #- header: value
    #- header: value (2)

    # conditional flows
    + i want to ask
    * $topic == 'buy phone' ~> buy phone
    * $item == 'orange' -> Sorry! We don't have orange.
    ~ ask topic
    - You are done! Item: $item

    # conditional command
    + what is my ip
    * true @> geoip
    - Here is your ip: $ip
    `);

    it('should handle conditional flows', async () => {
      const req = new Request('i want to ask');
      condFlowBot.handle(req);
      assert.match(req.speechResponse, /what topic/i, 'bot ask topic');
      assert.equal(req.currentFlow, 'ask topic');

      condFlowBot.handle(req.enter('buy phone'));
      assert.match(req.speechResponse, /what do you want to buy/i);
      assert.equal(req.currentFlow, 'buy phone');

      condFlowBot.handle(req.enter('apple'));
      assert.match(req.speechResponse, /you are done/i);
      assert.equal(req.currentFlow, undefined);

    });

    it('should handle conditional reply', async () => {
      const req = new Request('i want to ask');
      condFlowBot.handle(req);
      assert.match(req.speechResponse, /what topic/i, 'bot ask topic');
      assert.equal(req.currentFlow, 'ask topic');

      await condFlowBot.handleAsync(req.enter('buy phone'));
      assert.match(req.speechResponse, /what do you want to buy/i);
      assert.equal(req.currentFlow, 'buy phone');

      await condFlowBot.handleAsync(req.enter('orange'));
      assert.match(req.speechResponse, /sorry/i);
      assert.equal(req.currentFlow, undefined);
    });

    it('should handle conditional command', async () => {
      const req = new Request('what is my ip');
      await condFlowBot.handleAsync(req);
      assert.match(req.speechResponse, /here is your ip/i, 'bot reply');
      assert.match(req.variables.ip, /^(([1-9]?\d|1\d\d|2[0-4]\d|25[0-5])(\.(?!$)|(?=$))){4}$/, 'match ip');
    });
  });
});
