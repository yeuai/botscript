import XRegExp from 'xregexp';
import { Struct } from './struct';
import { Request } from './request';
import { Context } from './context';
import { IActivator } from '../interfaces/activator';
import { Logger } from '../lib/logger';
import { IMapActivator } from '../interfaces/map-activator';
import { evaluate } from '../lib/utils';

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
    replaceWith: (sub: string, name: string, def: Map<string, Struct>) => {
      const struct = def.get(name.toLowerCase()) as Struct;
      return !struct ? name : `(${struct.options.join('|')})`;
    },
  },
];

/**
 * Find & replace options pattern
 */
const findDefinitionReplacer = (
  replacement: string,
  search: RegExp,
  replaceWith: (sub: string, name: string, def: Map<string, Struct>) => string,
  definitions: Map<string, Struct>,
): string => {
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
};

/**
 * Transform & interpolate pattern
 * @param pattern dialogue trigger
 * @param context bot data context
 * @param notEqual negative flag
 */
export function transform(pattern: string, request: Request, context: Context, notEqual: boolean) {

  // test custom patterns in triggers
  for (const [name, value] of context.patterns) {
    if (value.match.test(pattern)) {
      logger.debug('Pattern match: ', name, pattern, value.match.source);
      return value.func(pattern, request);
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
        (substr, name) => {
          const replacement = replaceWith(substr, name, definitions);
          return findDefinitionReplacer(replacement, search, replaceWith, definitions);
        },
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

  // no captures!
  if (!result) { return {}; }
  const keys = Object.keys(result).filter(key => !['index', 'input', 'groups'].includes(key));
  const captures = keys.map(key => ({ [key.match(/^\d+$/) ? `$${parseInt(key)}` : key]: result[key as any] })).splice(1);
  return captures.reduce((a, b) => Object.assign(a, b), {});
}

/**
 * Get trigger activators
 * @param dialog random or dialogue flow
 * @param notEqual negative flag
 */
export function getActivators(dialog: Struct, ctx: Context, req: Request, notEqual = false) {
  return dialog.triggers.map(x => transform(x, req, ctx, notEqual));
}

/**
 * Get conditional activation
 * @param dialog a dialogue
 */
export function getActivationConditions(dialog: Struct) {
  // exclude conditional reply
  return dialog.conditions.filter(x => !/>/.test(x));
}

/**
 * Get sorted trigger activators
 */
export function getReplyDialogue(ctx: Context, req: Request)
  : Struct | undefined {
  const vActivators: IMapActivator[] = [];
  Array.from(ctx.dialogues.values())
    .forEach(x => {
      for (const trigger of x.triggers) {
        const activator = transform(trigger, req, ctx, false);
        vActivators.push({
          id: x.name,
          trigger,
          pattern: activator,
        })
      }
    });
  // transform activators and sort
  let vDialogue: Struct | undefined;
  vActivators.filter(x => x.pattern.test(req.message))
    // sort activator in descending order of length
    .sort((a, b) => b.pattern.source.length - a.pattern.source.length)
    // map info
    .some(x => {
      const captures = execPattern(req.message, x.pattern);
      const knowledges = { ...req.variables, ...captures, $previous: req.previous, $input: req.message };
      logger.debug(`Evaluate dialogue: ${x.pattern.source} => captures:`, captures);

      // Test conditional activation
      // - A conditions begins with star symbol: *
      // - Syntax: * expression
      const dialog = ctx.getDialogue(x.id) as Struct;
      const conditions = getActivationConditions(dialog);
      if (conditions.length > 0) {
        for (const cond of conditions) {
          const expr = cond.replace(/^[*]/, '');
          const vTestResult = evaluate(expr, knowledges);
          if (!vTestResult) {
            return false;
          }
        }
      }
      vDialogue = dialog;
      return true;
    });
  return vDialogue;
}
