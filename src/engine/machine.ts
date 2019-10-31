import { Machine, send, DefaultContext, EventObject, StateMachine } from 'xstate';
import { Context } from './context';

export class BotMachine {

  machine: StateMachine<DefaultContext, any, EventObject>;

  constructor(ctx: Context) {
    this.machine = Machine({
      id: 'botscript',
      initial: 'inactive',
      states: {
        inactive: {},
        flow: {
          context: ctx,
        },
      },
    });
  }
}
