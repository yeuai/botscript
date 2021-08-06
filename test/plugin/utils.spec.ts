import { BotScript, Request } from '../../src/engine';
import { assert } from 'chai';

describe('Plugin: utils', () => {

  describe('axios', () => {
    const botPlugin = new BotScript();
    botPlugin
      .parse(`
      > query answer

      + send question
      - answer $answer

      /plugin: query answer
      ~~~js
      const vResp = await utils.axios.get('http://httpbin.org/get?answer=42');
      req.variables.answer = vResp.data.args.answer;
      ~~~
      `);

    it('should get answer from httpbin service', async () => {
      let req = new Request('send question');

      req = await botPlugin.handleAsync(req);
      assert.equal(req.speechResponse, 'answer 42', 'send request and get value back');
    });

  });
});
