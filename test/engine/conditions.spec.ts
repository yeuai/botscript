import { BotScript, Request } from '../../src/engine';
import { REGEX_IP } from '../../src/lib/regex';
import { assert } from 'chai';

describe('BotScript: Conditional dialogue', () => {

  const bot = new BotScript();

  bot.parse(`
  + hello*
  * $name != null -> Are you $name?
  - Hello, human!
  - hi

  + my name is *{name}
  * $name == 'vunb' => Hello my boss!
  * $name == 'boss' => - I know you!
  - hello $name
  `);

  describe('basic condition', () => {
    it('respond NO REPLY!', async () => {
      let req = new Request();
      req = await bot.handleAsync(req.enter('my name is bob'));
      assert.match(req.speechResponse, /hello bob/i);

      req = await bot.handleAsync(req.enter('hello'));
      assert.match(req.speechResponse, /are you bob/i);

      req = await bot.handleAsync(req.enter('something'));
      assert.match(req.speechResponse, /NO REPLY/i);
    });
  });

  // common syntax
  describe('Syntax: * expresssion => action', () => {
    it('a reply', async () => {
      let req = new Request();
      req = await bot.handleAsync(req.enter('my name is vunb'));
      assert.match(req.speechResponse, /hello my boss/i);

      req = await bot.handleAsync(req.enter('my name is boss'));
      assert.match(req.speechResponse, /i know you/i);
    });
  });

  describe('conditional dialogues', () => {
    const condBot = new BotScript();
    condBot.parse(`
    ! topics
    - warranty
    - support
    - feedback

    ~ ask topic
    - What topic do you want to ask?
    + *{topic}

    ~ buy phone
    - What do you want to buy
    + I want to buy *{item}
    + *{item}

    + cancel
    - You are canceled!

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

    # conditional redirect
    + i dont wanna talk to you
    * true >> cancel
    - Ok!

    # conditional event
    + turn off the light
    * true +> notify
    - Ok!

    # conditional prompt
    + help me
    * true ?> topics
    - Please choose a topic!

    # conditional activations & previous history
    + knock knock
    - who is there

    + *
    * $previous[0] == 'who is there'
    * $input == 'its me' -> i know you!
    - $1 who?
    `);

    /**
     * Add bot event listener
     */
    condBot.once('notify', (req: Request) => {
      condBot.logger.info('Got an event:', req.currentDialogue, req.variables);
      req.variables.notified = true;
    });

    it('should handle conditional activation', async () => {
      let req = new Request();

      req = await condBot.handleAsync(req.enter('knock knock'));
      assert.match(req.speechResponse, /who is there/i);

      req = await condBot.handleAsync(req.enter('vunb'));
      assert.match(req.speechResponse, /vunb who/i);

      // lost context previous reply.
      req = await condBot.handleAsync(req.enter('vunb'));
      assert.match(req.speechResponse, /NO REPLY!/i);

      let req2 = new Request();

      req2 = await condBot.handleAsync(req2.enter('knock knock'));
      assert.match(req2.speechResponse, /who is there/i);

      req2 = await condBot.handleAsync(req2.enter('its me'));
      assert.match(req2.speechResponse, /i know you/i);
    });

    it('should handle conditional flows', async () => {
      let req = new Request('i want to ask');
      req = await condBot.handleAsync(req);
      assert.match(req.speechResponse, /what topic/i, 'bot ask topic');
      assert.equal(req.currentFlow, 'ask topic');

      req = await condBot.handleAsync(req.enter('buy phone'));
      assert.match(req.speechResponse, /what do you want to buy/i);
      assert.equal(req.currentFlow, 'buy phone');

      req = await condBot.handleAsync(req.enter('apple'));
      assert.match(req.speechResponse, /you are done/i);
      assert.equal(req.currentFlow, undefined);

    });

    it('should handle conditional reply', async () => {
      let req = new Request('i want to ask');
      req = await condBot.handleAsync(req);
      assert.match(req.speechResponse, /what topic/i, 'bot ask topic');
      assert.equal(req.currentFlow, 'ask topic');

      req = await condBot.handleAsync(req.enter('buy phone'));
      assert.match(req.speechResponse, /what do you want to buy/i);
      assert.equal(req.currentFlow, 'buy phone');

      req = await condBot.handleAsync(req.enter('orange'));
      assert.match(req.speechResponse, /sorry/i);
      assert.equal(req.currentFlow, undefined);
    });

    it('should handle conditional command', async () => {
      // ensure the internet is connected for this test case
      let req = new Request('what is my ip');
      req = await condBot.handleAsync(req);
      assert.match(req.speechResponse, /here is your ip/i, 'bot reply');
      assert.match(req.variables.ip, REGEX_IP, 'match ip');
    });

    it('should handle conditional redirect', async () => {
      let req = new Request('i dont wanna talk to you');
      req = await condBot.handleAsync(req);
      assert.isTrue(req.isForward);
      assert.isFalse(req.isFlowing);
      assert.match(req.speechResponse, /you are canceled/i, 'bot reply');
    });

    it('should handle conditional event', async () => {
      let req = new Request('turn off the light');
      req = await condBot.handleAsync(req);
      assert.match(req.speechResponse, /ok/i, 'bot reply');
      assert.equal(req.variables.notified, true, 'add more info');
    });

    it('should handle conditional prompt', async () => {
      let req = new Request('help me');
      req = await condBot.handleAsync(req);
      assert.match(req.speechResponse, /choose a topic/i, 'bot reply');
      assert.deepEqual(req.prompt, ['warranty', 'support', 'feedback'], 'get prompts');
    });
  });

});
