import { Fsm } from 'machina';
import XRegExp from 'xregexp';

const TYPES = {
  '!': 'definition',
  '+': 'dialogue',
  '-': 'response',
  '@': 'command',
  '?': 'question',
  '~': 'dialogflow',
  '#': 'comment',
};

export {
  TYPES,
};
