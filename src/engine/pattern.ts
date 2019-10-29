import XRegExp from 'xregexp';
import { Struct } from './struct';

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
 * Transform interpolation pattern
 * @param pattern
 * @param definitions
 * @param notEqual
 */
export function transform(pattern: string, definitions: Map<string, Struct>, notEqual: boolean) {
  PATTERN_INTERPOLATIONS.forEach(p => {
    const { search, replaceWith } = p;
    // is it already a string pattern?
    if (/^\/.+\/$/m.test(pattern)) {
      pattern = (pattern.match(/^\/(.+)\/$/m) as RegExpMatchArray)[1];
      return XRegExp(pattern);
    } else if (typeof replaceWith === 'string') {
      pattern = pattern.replace(search, replaceWith);
    } else {
      pattern = pattern.replace(search,
        (substr, name) => ((replacement): string => {
          // Check if the list contains reference to another list
          while (replacement.match(search) !== null) {
            (replacement.match(search) as RegExpMatchArray ).map(rl => {
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
export function execPattern(input: string, pattern: RegExp | any) {
  let captures = !pattern.label ? XRegExp.exec(input, pattern) : pattern.exec(input);
  const keys = Object.keys(captures).filter(key => !['index', 'input', 'groups'].includes(key));
  captures = keys.map(key => ({ [key.match(/^\d+$/) ? `$${parseInt(key)}` : key]: captures[key] })).splice(1);
  return captures.length > 0 ? captures.reduce((a: any, b: any) => Object.assign(a, b)) : [];
}
