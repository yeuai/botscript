import { Machine, EventObject, StateMachine, send, assign } from 'xstate';
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
              DIALOG: 'dialogue',
              FLOW: 'flow',
              DEFECT: 'nomatch',
            },
          },
          dialogue: {
            on: {
              FLOW: 'flow',
              RESOLVE: 'output',
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
              RETRY: 'digest',
              RESOLVE: 'output',
            },
          },
          output: {
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
        actions: {
          digest: (context, event) => {
            const req = context.req;
            const ctx = context.ctx;
            this.logger.debug('Enter action: ', event.type);
            this.logger.debug('Digest new request: ', req.message);
            if (!req.isFlowing) {
              // process purpose bot
              for (const [name, dialog] of ctx.dialogues) {
                const isMatch = this.explore({ dialog, ctx, req });
                this.logger.debug('Test matching: ', name, isMatch);
                if (isMatch) {
                  req.currentDialogue = dialog.name;
                  req.flows = dialog.flows;
                  break;
                }
              }
            }

          },
          dialogue: (context, event) => {
            // TODO: find one candidate in dialogue flows
            const dialog = context.ctx.dialogues.get(context.req.currentDialogue) as Struct;
            // Get next flows

            this.logger.info('Enter dialogue state', context, event.type, dialog.name);
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
    this.logger.info('Resolve: ', req.message, req.currentDialogue);
    const ctxMachine = this.machine.withContext({ ctx, req });
    ctxMachine.transition('digest', '');
    // send(req.currentFlow);
  }

  /**
   * Explore dialogue triggers
   * @param param0
   */
  private explore({ dialog, ctx, req }: { dialog: Struct, ctx: Context, req: Request }) {
    const result = getActivators(dialog, ctx.definitions)
      .filter((x) => RegExp(x.source, x.flags).test(req.message))
      .some(pattern => {
        this.logger.info('Found: ', dialog.name, pattern.source);

        const captures = execPattern(req.message, pattern);
        Object.keys(captures).forEach(name => {
          req.variables[name] = captures[name];
        });
        // add $ as the first matched variable
        req.variables.$ = captures.$1;
        // reference to the last input
        req.variables.$input = req.message;
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
