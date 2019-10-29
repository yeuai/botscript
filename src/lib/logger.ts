import debug from 'debug';

const APP_NAME = 'BotScript';

export class Logger {

  /**
   * private members
   */
  private _debug: debug.Debugger;
  private _info: debug.Debugger;
  private _warn: debug.Debugger;
  private _error: debug.Debugger;

  constructor(prefix?: string) {
    prefix = prefix ? ':' + prefix : '';
    this._debug = debug(`${APP_NAME}${prefix }`);
    this._info = debug(`${APP_NAME}:INFO${prefix}`);
    this._warn = debug(`${APP_NAME}:WARN${prefix}`);
    this._error = debug(`${APP_NAME}:ERROR${prefix}`);
  }

  get debug() {
    return this._debug;
  }

  get info() {
    return this._info;
  }

  get warn() {
    return this._warn;
  }

  get error() {
    return this._error;
  }

}
