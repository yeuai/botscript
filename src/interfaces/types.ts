import { Request, Context } from '../engine';

export type TestConditionalCallback = (data: string, ...args: any[]) => boolean | void;
export type PluginCallback = (req: Request, ctx: Context) => void;

/**
 * Dialogue struct types
 */
export enum Types {
  Definition = '!',
  Trigger = '+',
  Reply = '-',
  Flow = '~',
  Condition = '*',
  Comment = '#',
  ConditionalFlow = '~',
  ConditionalReply = '-',
  ConditionalCommand = '@',
  ConditionalPrompt = '?',
  ConditionalForward = '>',
  ConditionalEvent = '+',
}
