
/**
 * BotScript dialogue engine
 */
export class BotScript {
  constructor() {

  }

  /**
   * Return ready bot engine
   */
  then(/** */) {
    return this;
  }

  /**
   * Bot scripts parser
   * @param content
   */
  parse(content: string) {
    const scripts = content
      // convert CRLF into LF
      .replace(/\r\n/g, '\n')
      // remove comments
      .replace(/^#.*$\n/igm, '')
      // split interactions by linebreaks
      .split(/\n{2,}/)
      // remove empty lines
      .filter(script => script)
      // trim each of them
      .map(script => script.trim());

    return this;
  }
}
