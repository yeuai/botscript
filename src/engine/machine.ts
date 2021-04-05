import { Machine, EventObject, StateMachine, send, assign, interpret } from 'xstate';
import { Context } from './context';
import { Logger } from '../lib/logger';
import * as utils from '../lib/utils';
import { Request } from './request';
import { getActivators, execPattern, getActivationConditions } from './pattern';
import { Struct } from './struct';
import { Types } from '../interfaces/types';

export class BotMachine {

  private machine: StateMachine<{ ctx: Context, req: Request }, any, EventObject>;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Machine');
    this.machine = Machine(
      {
        id: 'botscript',
        initial: 'pending',
        states: {
          pending: {
            on: {
              DIGEST: {
                target: 'digest',
                // actions: ['digest'],
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
                  // const dialog = ctx.dialogues.get(req.originalDialogue) as Struct;
                  // // TODO: Move test conditional flow to replypopulation?
                  // this.logger.debug('Test conditional flow of original dialogue: ' + req.originalDialogue);
                  // // test conditional flows
                  // utils.testConditionalType(Types.ConditionalFlow, dialog, req, (flow: string) => {
                  //   if (req.resolvedFlows.indexOf(flow) < 0 && req.missingFlows.indexOf(flow) < 0) {
                  //     this.logger.info('Add conditional flow: ', flow);
                  //     req.missingFlows.push(flow);
                  //   }
                  // });

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
            // on: {
            //   '': [
            //     {
            //       target: 'output',
            //       cond: (context, event) => {
            //         context.req.speechResponse = 'NO REPLY!';
            //         context.req.isNotResponse = true;
            //         return true;
            //       },
            //     },
            //   ],
            // },
          },
          output: {
            // entry: [
            //   'onCommand',
            //   'onRedirect',
            //   'onPrompt',
            //   'onPopulate',
            // ],
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
            const { req, ctx } = context;
            if (!req.isFlowing) {
              // process purpose bot
              this.logger.info('Find dialogue candidate ...');
              for (const [name, dialog] of ctx.dialogues) {
                const isMatch = this.explore({ dialog, ctx, req });
                if (isMatch) {
                  this.logger.debug('Found a dialogue candidate: ', name, req.variables);
                  req.currentDialogue = dialog.name;
                  req.originalDialogue = dialog.name;
                  req.flows = dialog.flows;
                  req.missingFlows = dialog.flows;
                  // break;
                  return true;
                }
              }
              this.logger.info('Not found dialogue candidate!');
            }
            return false;
          },
          isFlow: (context, event) => {
            const { req, ctx } = context;
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
            //// TODO: Update req states here? i don't think so??
            // else {
            //   // update state
            //   req.isFlowing = false;
            // }
            return req.isFlowing;
          },
        },
        actions: {
          onDigest: (context, event) => {
            const { req, ctx } = context;
            this.logger.debug('Enter digest action: ', event.type, req.message);
          },
          onPopulate: (context, event) => {
            // let dialog: Struct;
            // const { req, ctx } = context;

            // this.logger.info(`Current request: isFlowing=${req.isFlowing}, dialogue=${req.currentDialogue}, flow=${req.currentFlow}`);

            // if (!req.isFlowing) {
            //   dialog = ctx.dialogues.get(req.originalDialogue) as Struct;
            // } else {
            //   dialog = ctx.flows.get(req.currentFlow) as Struct;
            // }

            // // const dialog = ctx.getDialogue(req.currentDialogue) as Struct;

            // // Generate output!
            // if (dialog) {
            //   let vResult = false;
            //   utils.testConditionalType(Types.Reply, dialog, req, (reply) => {
            //     vResult = true;
            //     this.logger.info('Populate speech response, with conditional reply:', req.message, reply);
            //     req.speechResponse = ctx.interpolate(reply || '[noReply]', req);
            //   });

            //   if (!vResult) {
            //     const replyCandidate = utils.random(dialog.replies);
            //     this.logger.info('Populate speech response: ', req.message, replyCandidate);
            //     req.speechResponse = ctx.interpolate(replyCandidate || '[noReply]', req);
            //   }
            // } else {
            //   this.logger.info('No dialogue population!');
            // }
          },
          onCommand: (context, event) => {
            // const { req, ctx } = context;
            // this.logger.info('Evaluate conditional command for:', req.currentDialogue);
            // const dialog = ctx.getDialogue(req.currentDialogue) as Struct;
            // // check command conditions
            // utils.testConditionalType(Types.Command, dialog, req, (cmd) => {
            //   if (ctx.commands.has(cmd)) {
            //     const command = ctx.commands.get(cmd) as Struct;
            //     // execute commands
            //     this.logger.debug('Execute command: ', cmd);
            //     const result = utils.callHttpService(command, req);

            //     // populate result into variables
            //     this.logger.debug('Populate command result into variables:', cmd, result);
            //     Object.assign(req.variables, result);
            //     return true;
            //   } else {
            //     this.logger.warn('No command definition: ', cmd);
            //     return false;
            //   }
            // });
          },
          onRedirect: (context, event) => {
            // TODO: change conditional redirect
            const { req, ctx } = context;
            this.logger.info('Evaluate conditional redirect for:', req.currentDialogue);

            // if a condition satisfy then redirect dialogue
          },
          onPrompt: (context, event) => {
            // TODO: get conditional prompt
            const { req, ctx } = context;
            this.logger.info('Evaluate conditional prompt for:', req.currentDialogue);
            // send extra definition prompt list
          },
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
    const botMachine = this.machine.withContext({ ctx, req });
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
          // TODO: Remove `captures` in version 2.x, move to $flows.context (not append to variables)
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
          req.variables = knowledges;
          if (req.isFlowing) {
            // assign session captured flows
            Object.assign(req.$flows, captures);
          }

          // add $ as the first matched variable for reply population
          if (captures.$1) {
            req.variables.$ = captures.$1;
            // dialogue is in the flow
            if (req.isFlowing) {
              req.$flows[req.currentFlow] = captures.$1;
              req.variables[req.currentFlow] = captures.$1;
            }
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
