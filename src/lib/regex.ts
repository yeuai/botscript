const REGEX_HEADER_SEPARATOR = / *: */;
const REGEX_IP = /^(([1-9]?\d|1\d\d|2[0-4]\d|25[0-5])(\.(?!$)|(?=$))){4}$/;

export {
  REGEX_IP,
  REGEX_HEADER_SEPARATOR,
};
