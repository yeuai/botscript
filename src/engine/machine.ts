import { Machine, EventObject, StateMachine, send, assign } from 'xstate';
import { Context } from './context';
import { Logger } from '../lib/logger';
import { Request } from './request';

export class BotMachine {

  machine: StateMachine<Context, any, EventObject>;
  logger: Logger;

  constructor() {
    this.logger = new Logger('Machine');
    this.machine = Machine(
      {
        id: 'botscript',
        initial: 'digest',
        states: {
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
          dialogue: (context, event) => {
            this.logger.info('Enter dialogue state', context, event.type);
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
   * @param req
   * @param ctx
   */
  resolve(req: Request, ctx: Context) {
    const ctxMachine = this.machine.withContext(ctx);
    ctxMachine.transition(req.currentFlow, '');
    send(req.currentFlow);
  }
}
