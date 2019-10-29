import XRegExp from 'xregexp';
import { Struct } from './struct';

const PATTERN_INTERPOLATIONS = [
  // escape characters '.' and '?'
  { search: /[.?]/g, replaceWith: '\\$&' },
  // '#{varName}' => '(?<varName> \d[\d\,\.\s]* )'
  { search: /#\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>\\d[\\d\\,\\.\\s]*)' },
  // '${varName}' => '(?<varName> [a-z]+ )'
  { search: /\$\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>[a-z]+)' },
  // '*{varName}' => '(?<varName> .* )'
  { search: /\*\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>.*)' },
  // '$varName' => '(?<varName> [a-z]+ )'
  { search: /\$([a-z][\w_]*)/g, replaceWith: '(?<$1>[a-z]+)' },
  // '#' => '(\d+)'
  { search: /(^|[\s,;—])#(?!\w)/g, replaceWith: '$1(\\d+)' },
  // '*' => '(.*)'
  { search: /(^|[\s,;—])\*(?!\w)/g, replaceWith: '$1(.*)' },
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
    if (typeof replaceWith === 'string') {
      pattern = pattern.replace(search, replaceWith);
    } else {
      throw new Error('Not implement');
    }
  });

  return notEqual
    ? XRegExp(`^((?!^${pattern}$).)+(?!\\w)`, 'ig')
    : XRegExp(`(?:^|[\\s,;—])${pattern}(?!\\w)`, 'ig');
}
