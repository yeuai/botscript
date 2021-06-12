import { EventObject, StateMachine, createMachine, interpret } from 'xstate';
import { Context } from './context';
import { Logger } from '../lib/logger';
import * as utils from '../lib/utils';
import { Request } from './request';
import { getActivators, execPattern, getActivationConditions, getReplyDialogue } from './pattern';
import { Struct } from './struct';
import { Response } from './response';

export class BotMachine {

  private machine: StateMachine<{ ctx: Context, req: Request, res: Response }, any, EventObject>;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Machine');
    this.machine = createMachine(
      {
        id: 'botscript',
        initial: 'pending',
        states: {
          pending: {
            on: {
              DIGEST: {
                target: 'digest',
                actions: ['onDigest'],
              },
            },
          },
          digest: {
            always: [
              {
                target: 'dialogue',
                cond: 'isForward',
              },
              {
                target: 'dialogue',
                cond: 'isDialogue',
              },
              {
                target: 'flow',
                cond: 'isFlow',
              },
              {
                target: 'nomatch',
                cond: (ctx, event) => true,
              },
            ],
          },
          dialogue: {
            always: [
              {
                target: 'output',
                cond: (context, event) => {
                  const { req } = context;
                  if (req.missingFlows.length === 0) {
                    req.isFlowing = false;
                    this.logger.debug('Dialogue state is resolved then now forward to output!');
                    return true;
                  } else {
                    this.logger.debug('Dialogue flows remaining: ', req.missingFlows.length);
                    return false;
                  }
                },
              },
              {
                target: 'flow',
                cond: (context, event) => {
                  const { req } = context;
                  req.isFlowing = true; // init status

                  return true;
                },
              },

            ],
          },
          flow: {
            always: [
              {
                target: 'output',
                cond: (context, event) => {
                  // popolate flows from currentFlow and assign to request
                  const { req, ctx } = context;

                  if (req.currentFlowIsResolved) {
                    // remove current flow & get next
                    if (req.currentFlow) {
                      this.logger.debug('Remove current flow: ', req.currentFlow);
                      req.resolvedFlows.push(req.currentFlow);
                    }
                    req.missingFlows = req.missingFlows.filter(x => x !== req.currentFlow);
                    req.currentFlow = req.missingFlows.find(() => true) as string;
                    req.isFlowing = req.missingFlows.some(() => true);
                    req.currentFlowIsResolved = false;  // reset state
                    this.logger.debug('Next flow: ', req.currentFlow);
                  } else if (!req.currentFlow) {
                    // get next flow
                    req.currentFlow = req.missingFlows.find(() => true) as string;
                    req.currentFlowIsResolved = false;
                    this.logger.debug('Start new dialogue flow: ', req.currentFlow);
                  } else {
                    this.logger.info('Prompt or send reply again!');
                  }

                  this.logger.info('Check & Update nested flows!');
                  if (ctx.flows.has(req.currentFlow)) {
                    const currentFlow = ctx.flows.get(req.currentFlow) as Struct;
                    const setFlows = new Set(req.flows);
                    // update nested flows
                    currentFlow.flows.forEach(x => setFlows.add(x));
                    // missing optional flows (conditional flows)
                    for (const flow of req.missingFlows) {
                      setFlows.add(flow);
                    }
                    req.flows = Array.from(setFlows);
                  }

                  this.logger.info(`Dialogue is flowing: ${req.isFlowing}, current: ${req.currentFlow || '[none]'}`);
                  return true;
                },
              },
            ],
          },
          nomatch: {
            always: [
              {
                target: 'output',
                cond: (context, event) => {
                  context.req.speechResponse = 'NO REPLY!';
                  context.req.isNotResponse = true;
                  return true;
                },
              },
            ],
          },
          output: {
            entry: [
              'notifyDone',
            ],
            type: 'final',
          },
        },
      },
      {
        guards: {
          isForward: (context, event) => {
            const { req, ctx } = context;
            if (req.isForward) {
              const dialog = ctx.dialogues.get(req.currentDialogue) as Struct;
              this.explore({ dialog, ctx, req });

              this.logger.debug('Redirect to: ', dialog.name, req.variables);
              req.currentDialogue = dialog.name;
              req.originalDialogue = dialog.name;
              req.flows = dialog.flows;
              req.missingFlows = dialog.flows;
              return true;
            }
            return false;
          },
          isDialogue: (context, event) => {
            this.logger.info('Find dialogue candidate ...');
            const { req, res, ctx } = context;
            const reply = getReplyDialogue(ctx, req);
            // assign reply
            res.reply = reply;

            if (reply.dialog) {
              const dialog = reply.dialog;
              req.currentDialogue = dialog.name;
              req.currentFlowIsResolved = true;
              if (!req.isFlowing) {
                // process purpose bot
                this.logger.debug('Found a dialogue candidate: ', dialog.name, req.variables);
                req.originalDialogue = dialog.name;
                req.flows = dialog.flows;
                req.missingFlows = dialog.flows;
                Object.assign(req.variables, reply.captures);
                return true;
              } else {
                this.logger.info(`Dialogue is flowing: [current=${req.currentDialogue},original=${req.originalDialogue}]`);
                // assign session captured flows
                Object.assign(req.$flows, reply.captures, { [req.currentFlow]: reply.captures.$1 });
              }
            }
            return false;
          },
          isFlow: ({ req, ctx }) => {

            if (req.isFlowing && ctx.flows.has(req.currentFlow)) {
              const flow = ctx.flows.get(req.currentFlow) as Struct;

              this.logger.debug('Dialogue request is in the flow: ', req.currentFlow);
              // Explore and capture variables
              const isMatch = this.explore({ dialog: flow, ctx, req });
              if (isMatch) {
                const vCurrentFlowValue = req.$flows[req.currentFlow];
                this.logger.debug(`Captured a dialogue flow: ${req.currentFlow} => ${vCurrentFlowValue}`);
              } else {
                this.logger.debug('Dialogue flow is not captured!');
              }
            }
            return req.isFlowing;
          },
        },
        actions: {
          onDigest: ({ req, res, ctx }) => {
            this.logger.debug('onDigest: ', req.message);
          },
          notifyDone: (context, event) => {
            this.logger.info('Bot machine done!');
          }
        },
      },
    );
  }

  /**
   * Resolve dialogue flows with current context
   * @param req - human context
   * @param ctx - bot context
   */
  resolve(req: Request, ctx: Context) {
    // reset speech response
    // & interpret new state machine
    req.prompt = [];
    req.speechResponse = '';
    req.isNotResponse = false;
    if (!req.isForward) {
      // clear first-state conditions
      req.currentDialogue = '';
    }
    this.logger.info(`Resolve: ${req.message}, isFlowing: ${req.isFlowing}`);

    // TODO: Explore dialogues first to define type which is forward, flow or first-dialogue.
    // TODO: Explore should support async task
    const res = new Response();
    const botMachine = this.machine.withContext({ ctx, req, res });
    const botService = interpret(botMachine)
      .onTransition(state => {
        this.logger.info('Enter state: ', state.value);
      })
      .start();
    botService.send('DIGEST');
    this.logger.info('Resolved dialogue:', req.currentDialogue);
    return req;
  }

  /**
   * Explore dialogue triggers
   * @param obj dialog, ctx, req
   */
  private explore({ dialog, ctx, req }: { dialog: Struct, ctx: Context, req: Request }) {
    try {
      const result = getActivators(dialog, ctx, req)
        .filter((x) => x.test(req.message))
        .some(pattern => {
          // extract message information
          const captures = execPattern(req.message, pattern);
          const knowledges = { ...req.variables, ...captures, $previous: req.previous, $input: req.message };
          this.logger.debug(`Explore dialogue for evaluation: ${pattern.source} => captures:`, captures);

          // Test conditional activation
          // - A conditions begins with star symbol: *
          // - Syntax: * expression
          const conditions = getActivationConditions(dialog);
          if (conditions.length > 0) {
            for (const cond of conditions) {
              const expr = cond.replace(/^[*]/, '');
              const vTestResult = utils.evaluate(expr, knowledges);
              if (!vTestResult) {
                return false;
              }
            }
          }

          // update dialogue response
          req.currentDialogue = dialog.name;
          req.currentFlowIsResolved = true;
          if (req.isFlowing) {
            // assign session captured flows
            Object.assign(req.$flows, captures, { [req.currentFlow]: captures.$1 });
          } else {
            Object.assign(req.variables, captures);
          }

          return true;
        });

      // log result
      this.logger.debug(`Test dialogue candidate: ${dialog.name} =>`, result);

      return result;
    } catch (error) {
      this.logger.error('Cannot explore Dialogue!', error);
      throw error;
    }
  }

}
