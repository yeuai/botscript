export const SYM_CODE1 = '```';
export const SYM_CODE2 = '~~~';
export const PLUGINS_BUILT_IN = `
/plugin: addTimeNow
~~~js
const now = new Date();
req.variables.time = \`\${now.getHours()}:\${now.getMinutes()}\`;
~~~


/plugin: normalize
~~~js
req.message = utils.clean.all(req.message).replace(/[+-?!.,]+$/, '');
~~~

/plugin: noReplyHandle
~~~js
const postProcessing = (res, ctx) => {
  if (res.speechResponse === 'NO REPLY!') {
    if (ctx.flows.has(res.currentFlow)) {
      const dialog = ctx.flows.get(res.currentFlow);
      const replyCandidate = utils.random(dialog.replies);
      res.speechResponse = replyCandidate;
    } else {
      res.speechResponse = "Sorry! I don't understand!";
    }
  }
};

return postProcessing;
~~~

/plugin: nlu
~~~js
logger.info('Process NLU: ', 123);
const vCommandNlu = ctx.commands.get('nlu');
// Extract intent/entities from vNluDirective API Server.
logger.info('Send command request: ' + vCommandNlu?.name);
const vResult = await utils.callHttpService(vCommandNlu, req);

// attach result to request message.
req.intent = vResult.intent;
req.entities = vResult.entities;
logger.info('NLU intent: ' + vResult.intent);
logger.info('NLU entities: ' + vResult.entities);
~~~
`;

/**
 * Extract plugin code & wrap it!
 * @param plugin
 * @returns
 */
export function wrapCode(plugin: string): string {
  const vCode = plugin
    .replace(/```js([^`]*)```/, (m: string, code: string) => code)
    .replace(/~~~js([^~]*)~~~/, (m: string, code: string) => code);

  return `
  return () => (async ({req, ctx, utils, logger}) => {
    try {
      ${vCode}
    } catch (error) {
      logger.error('Execute error!', error);
    }
  })({req, ctx, utils, logger})`;
}
