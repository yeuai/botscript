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
                actions: ['digest'],
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
                  target: 'flow',
                  cond: (context, event) => {
                    // check remaining flows
                    const {req, ctx} = context;
                    const indexFlow = req.resolvedFlows.indexOf(req.currentFlow);
                    if (indexFlow >= 0) {
                      // remove resolved task
                      req.flows.splice(indexFlow, 1);
                    }

                    // next flow
                    const flow = req.flows.find(() => true);

                    if (typeof flow === 'undefined') {
                      //
                    } else {
                      return true;
                    }
                    return false;
                  },
                },
                {
                  target: 'output',
                  cond: (context, event) => {
                    this.logger.info('Dialogue state resolve and forward to output!');
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
              NEXT: 'flow',
              RESOLVE: 'dialogue',
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
                  req.flows = dialog.flows;
                  // break;
                  return true;
                }
              }
            }
            return false;
          },
          isFlow: (context, event) => {
            if (context.req.isFlowing) {
              this.logger.debug('Request is the dialogue flows: ', context.req.currentFlow);
            }
            return context.req.isFlowing;
          },
        },
        actions: {
          digest: (context, event) => {
            const {req, ctx} = context;
            this.logger.debug('Enter digest action: ', event.type, req.message);
          },
          onPopulate: (context, event) => {
            let dialog: Struct;
            const {req, ctx} = context;
            dialog = context.ctx.flows.get(req.currentFlow) as Struct;
            if (!dialog) {
              dialog = context.ctx.dialogues.get(context.req.currentDialogue) as Struct;
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
          flows: (context, event) => {
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
        this.logger.debug('Dialogue matches & captures: ', pattern.source);

        const captures = execPattern(req.message, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
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
