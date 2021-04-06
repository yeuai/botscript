/**
 * Regex for utilities
 */
const REGEX_HEADER_SEPARATOR = / *: */;
const REGEX_IP = /^(([1-9]?\d|1\d\d|2[0-4]\d|25[0-5])(\.(?!$)|(?=$))){4}$/;

/**
 * Regex for botscript document
 */
const REGEX_COND_REPLY_TESTER = /.+\s*?([->@?+~=])>\s*?.+/;

/**
 * Support conditional replies:
 * Valid token: reply (-), forward (>), command (@), prompt (?), event (+), flow (~)
 */
const REGEX_COND_REPLY_TOKEN = /[->@?+~]/;
// Extended lamda expresion syntax
const REGEX_COND_LAMDA_EXPR = /[->@?+~=]>/;

export {
  REGEX_IP,
  REGEX_HEADER_SEPARATOR,
  REGEX_COND_REPLY_TESTER,
  REGEX_COND_REPLY_TOKEN,
  REGEX_COND_LAMDA_EXPR,
};
