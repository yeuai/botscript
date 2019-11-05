import { Machine, EventObject, StateMachine, send, assign, interpret } from 'xstate';
import { Context } from './context';
import { Logger } from '../lib/logger';
import * as utils from '../lib/utils';
import { Request } from './request';
import { getActivators, execPattern } from './pattern';
import { Struct } from './struct';

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
            on: {
              '': [
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
              // 'DIALOG': 'dialogue',
              // 'FLOW': 'flow',
              // 'DEFECT': 'nomatch',
            },
          },
          dialogue: {
            on: {
              '': [
                {
                  target: 'output',
                  cond: (context, event) => {
                    const {req, ctx} = context;
                    // TODO: check conditional reply, flow or forward
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
                    const {req, ctx} = context;
                    req.isFlowing = true; // init status

                    return true;
                  },
                },
              ],
              // FLOW: 'flow',
              // RESOLVE: 'output',
            },
          },
          flow: {
            on: {
              '': [
                {
                  target: 'output',
                  cond: (context, event) => {
                    // popolate flows from currentFlow and assign to request
                    const {req, ctx} = context;

                    if (req.currentFlowIsResolved) {
                      // remove current flow
                      this.logger.debug('Remove current flow: ', req.currentFlow);
                      req.missingFlows = req.missingFlows.filter(x => x !== req.currentFlow);
                      req.currentFlow = req.missingFlows.find(() => true) as string;
                      req.isFlowing = req.missingFlows.some(() => true);
                      req.currentFlowIsResolved = false;  // reset state
                      this.logger.debug('Next flow: ', req.currentFlow);
                    } else if (!req.currentFlow) {
                      req.currentFlow = req.missingFlows.find(() => true) as string;
                      req.currentFlowIsResolved = false;
                      this.logger.debug('Start new dialogue flow: ', req.currentFlow);
                    } else {
                      this.logger.info('TODO: Prompt or send reply again!');
                    }

                    this.logger.info('Check & Update nested flows!');
                    if (ctx.flows.has(req.currentFlow)) {
                      const currentFlow = ctx.flows.get(req.currentFlow) as Struct;
                      const setFlows = new Set(req.flows);
                      // update nested flows
                      currentFlow.flows.forEach(x => setFlows.add(x));
                      req.flows = Array.from(setFlows);
                    }

                    this.logger.info(`Dialogue is flowing: ${req.isFlowing}, current: ${req.currentFlow || '[not start]'}`);
                    return true;
                  },
                },
              ],
              // 'NEXT': 'flow',
              // 'RESOLVE': 'dialogue',
              // REPLY: 'output' (cannot go straight to output, must resolve and back to the dialogue)
            },
          },
          nomatch: {
            on: {
              '': [
                {
                  target: 'output',
                  cond: (context, event) => {
                    context.req.speechResponse = 'NO REPLY!';
                    return true;
                  },
                },
              ],
            },
          },
          output: {
            entry: ['onPopulate'],
            on: {
              POPULATE: 'populate',
              COMMAND: 'command',
              REPLY: 'response',
            },
          },
          command: {
            on: {
              RESOLVE: 'output',
            },
          },
          populate: {
            on: {
              RESOLVE: 'output',
            },
          },
          response: {
            type: 'final',
          },
        },
      },
      {
        guards: {
          isDialogue: (context, event) => {
            const {req, ctx} = context;
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
            if (context.req.isFlowing) {
              const {req, ctx} = context;
              const flow = ctx.flows.get(req.currentFlow) as Struct;

              this.logger.debug('Dialogue request is in the flow: ', context.req.currentFlow);
              // Explore and capture variables
              const isMatch = this.explore({ dialog: flow, ctx, req });
              if (isMatch) {
                this.logger.debug('Captured a dialogue flow: ', req.currentFlow, req.variables);
              } else {
                this.logger.debug('Dialogue flow is not captured!');
              }
            }
            return context.req.isFlowing;
          },
        },
        actions: {
          onDigest: (context, event) => {
            const {req, ctx} = context;
            this.logger.debug('Enter digest action: ', event.type, req.message);
          },
          onPopulate: (context, event) => {
            let dialog: Struct;
            const {req, ctx} = context;

            this.logger.info(`Current request: isFlowing=${req.isFlowing}, dialogue=${req.currentDialogue}, flow=${req.currentFlow}`);

            if (!req.isFlowing) {
              dialog = ctx.dialogues.get(req.originalDialogue) as Struct;
            } else {
              dialog = ctx.flows.get(req.currentFlow) as Struct;
            }

            // Generate output!
            if (dialog) {
              this.logger.info('Populate speech response: ', req.message);
              const replyCandidate = utils.random(dialog.replies);
              req.speechResponse = ctx.interpolate(replyCandidate, req);
            } else {
              this.logger.info('No dialogue population!');
            }
          },
          onFlow: (context, event) => {
            this.logger.info('Enter flows state', context, event.type);
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
    this.logger.info(`Resolve: ${req.message}, isFlowing: ${req.isFlowing}`);
    const botMachine = this.machine.withContext({ ctx, req });
    const botService = interpret(botMachine)
      .onTransition(state => {
        this.logger.info('Enter state: ', state.value);
      })
      .start();
    botService.send('DIGEST');
    this.logger.info('speechResponse: ', req.speechResponse);
  }

  /**
   * Explore dialogue triggers
   * @param param0
   */
  private explore({ dialog, ctx, req }: { dialog: Struct, ctx: Context, req: Request }) {
    const result = getActivators(dialog, ctx.definitions)
      .filter((x) => RegExp(x.source, x.flags).test(req.message))
      .some(pattern => {
        this.logger.debug('Dialogue matches & captures (resolved): ', pattern.source);

        const captures = execPattern(req.message, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
        req.currentDialogue = dialog.name;
        req.currentFlowIsResolved = true;
        // add $ as the first matched variable
        req.variables.$ = captures.$1;
        // reference to the last input
        req.variables.$input = req.message;
        return true;
      });
    return result;
  }

  /**
   * Build current context response
   * @param dialog
   * @param trigger
   * @param req
   */
  private buildResponse(req: Request, dialog: Struct, ctx: Context) {
    const result = getActivators(dialog, ctx.definitions)
      .filter((x) => RegExp(x.source, x.flags).test(req.message))
      .some(pattern => {
        this.logger.info('Found: ', dialog.name, pattern.source);

        if (dialog.flows.length > 0) {
          // TODO: resolves deepest flow (node leaf)
          req.flows = dialog.flows; // .map(x => x.replace(/ .*/, ''));
          // mark dialogue name as the current node
          req.currentDialogue = dialog.name;
          // TODO: fires machine (FSM) start
        }

        const captures = execPattern(req.message, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
        // add $ as the first matched variable
        req.variables.$ = captures.$1;
        // reference to the last input
        req.variables.$input = req.message;

        const replyCandidate = utils.random(dialog.replies);
        req.speechResponse = ctx.interpolate(replyCandidate, req);
        return true;
      });

    return result;
  }
}
