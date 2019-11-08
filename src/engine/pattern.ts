import XRegExp from 'xregexp';
import { Struct } from './struct';
import { Context } from './context';
import { IActivator } from '../interfaces/activator';
import { Logger } from '../lib/logger';

const logger = new Logger('Pattern');

const PATTERN_INTERPOLATIONS = [
  {
    // escape characters '.' and '?'
    search: /[.?]/g,
    replaceWith: '\\$&',
  },
  {
    // '#{varName}' => '(?<varName> \d[\d\,\.\s]* )'
    search: /#\{([a-z][\w_]*)\}/g,
    replaceWith: '(?<$1>\\d[\\d\\,\\.\\s]*)',
  },
  {
    // '${varName}' => '(?<varName> [a-z]+ )'
    search: /\$\{([a-z][\w_]*)\}/g,
    replaceWith: '(?<$1>[a-z]+)',
  },
  {
    // '*{varName}' => '(?<varName> .* )'
    search: /\*\{([a-z][\w_]*)\}/g,
    replaceWith: '(?<$1>.*)',
  },
  {
    // '$varName' => '(?<varName> [a-z]+ )'
    search: /\$([a-z][\w_]*)/g,
    replaceWith: '(?<$1>[a-z]+)',
  },
  {
    // '#' => '(\d+)'
    search: /(^|[\s,;—])#(?!\w)/g,
    replaceWith: '$1(\\d+)',
  },
  {
    // '*' => '(.*)'
    search: /(^|[\s,;—])\*(?!\w)/g,
    replaceWith: '$1(.*)',
  },
  {
    // '[definition_name]' => '(?:item_1|item_2)'
    search: /!*\[(\w+)\]/g,
    replaceWith: (sub: string, name: string, def: Map<string, Struct>) => `(${(def.get(name.toLowerCase()) as Struct).options.join('|')})`,
  },
];

/**
 * Transform & interpolate pattern
 * @param pattern dialogue trigger
 * @param context bot data context
 * @param notEqual negative flag
 */
export function transform(pattern: string, context: Context, notEqual: boolean) {

  // test custom patterns in triggers
  for (const [name, value] of context.patterns) {
    if (value.match.test(pattern)) {
      logger.debug('Pattern match: ', name, pattern, value.match.source);
      return value.func(pattern);
    }
  }

  // is it already a string pattern?
  if (/^\/.+\/$/m.test(pattern)) {
    pattern = (pattern.match(/^\/(.+)\/$/m) as RegExpMatchArray)[1];
    return XRegExp(pattern);
  }

  // definition poplulation
  const definitions = context.definitions;
  // basic pattern
  PATTERN_INTERPOLATIONS.forEach(p => {
    const { search, replaceWith } = p;
    if (typeof replaceWith === 'string') {
      pattern = pattern.replace(search, replaceWith);
    } else {
      pattern = pattern.replace(search,
        (substr, name) => ((replacement): string => {
          // Check if the list contains reference to another list
          while (replacement.match(search) !== null) {
            (replacement.match(search) as RegExpMatchArray).map(rl => {
              const referencingListName = rl.slice(1, rl.length - 1);
              const referencingListPattern = replaceWith(rl, referencingListName, definitions);
              const referencingListReg = new RegExp(`\\[${referencingListName}\\]`, 'g');
              replacement = replacement.replace(referencingListReg, referencingListPattern.slice(1, referencingListPattern.length - 1));
            });
          }

          return replacement;
        })(replaceWith(substr, name, definitions)),
      );
    }
  });

  return notEqual
    ? XRegExp(`^((?!^${pattern}$).)+(?!\\w)`, 'ig')
    : XRegExp(`(?:^|[\\s,;—])${pattern}(?!\\w)`, 'ig');
}

/**
 * Extract and captures named variables
 * @param input
 * @param pattern
 */
export function execPattern(input: string, pattern: RegExp | IActivator) {
  const result = pattern instanceof RegExp ? XRegExp.exec(input, pattern) : pattern.exec(input);
  const keys = Object.keys(result).filter(key => !['index', 'input', 'groups'].includes(key));
  const captures = keys.map(key => ({ [key.match(/^\d+$/) ? `$${parseInt(key)}` : key]: result[key as any] })).splice(1);
  return captures.reduce((a, b) => Object.assign(a, b), {});
}

/**
 * Get trigger activators
 * @param dialog random or dialogue flow
 * @param notEqual negative flag
 */
export function getActivators(dialog: Struct, context: Context, notEqual = false) {
  return dialog.triggers.map(x => transform(x, context, notEqual));
}
