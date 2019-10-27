import { Fsm } from 'machina';
import XRegExp from 'xregexp';

const TYPES = {
  '+': 'trigger',
  '-': 'reply',
  '=': 'list',
};

export {
  TYPES,
};
