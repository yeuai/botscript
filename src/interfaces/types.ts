export type TestConditionalCallback = (data: string, ...args: any[]) => boolean | void;

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
  Command = '@',
  Prompt = '?',
  Forward = '>',
}
