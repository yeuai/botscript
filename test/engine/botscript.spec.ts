import { assert } from 'chai';
import { BotScript, Request } from '../../src/engine';

describe('BotScript', () => {

  const bot = new BotScript();

  bot.parse(`
  ! name BotScript

  + hello bot
  - Hello human!

  + what is your name
  - My name is [name]

  `);

  describe('basic reply', () => {
    it('respond a message to human', async () => {
      const req = new Request('hello bot');
      const res = await bot.handleAsync(req);
      assert.match(res.speechResponse, /hello human/i, 'bot reply human');
    });

    it('should reply with definition', async () => {
      const req = new Request('what is your name');
      const res = await bot.handleAsync(req);
      assert.match(res.speechResponse, /my name is botscript/i, 'bot shows his name');
    });
  });

  describe('no reply', () => {
    it('should respond no reply!', async () => {
      const req = new Request('sfdsfi!');
      const res = await bot.handleAsync(req);
      assert.match(res.speechResponse, /no reply/i, 'bot no reply');
    });
  });

  describe('add custom pattern', () => {
    // tslint:disable-next-line: no-shadowed-variable
    const bot = new BotScript();
    bot.parse(`/plugin: nlp
      ~~~js
      if (req.message === 'tôi là ai') {
        req.intent = 'whoami';
        req.entities = [{
          name: 'PER',
          value: 'Genius',
        }];
      }
      ~~~
    `);
    bot.parse(`
    + ([{ tag:VB }]) [{ word:you }]
    - So you want to $1 me, huh?

    + intent: whoami
    - You are genius!

    > nlp
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
        match: /^intent:/i,
        func: (pattern, req) => ({
          source: pattern,
          test: (input) => {
            const vIntentName = pattern.replace(/^intent:/i, '').trim();
            return req.intent === vIntentName;
          },
          exec: (input) => {
            // entities list
            return req.entities.map((x: any) => x.value);
          },
          toString: () => pattern,
        }),
      });

    it('should support TokensRegex', async () => {
      const res = await bot.handleAsync(new Request('love you'));
      assert.match(res.speechResponse, /you want to love/i, 'bot reply');
    });

    it('should detect intent', async () => {
      const res = await bot.handleAsync(new Request('tôi là ai'));
      assert.match(res.intent, /whoami/i, 'intent');
      assert.match(res.speechResponse, /you are genius/i, 'bot reply');
    });
  });

});
