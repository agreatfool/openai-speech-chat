import * as debug from 'debug';
import { LOGGER_PREFIX, LoggerType } from './type';

export class Logger {
  private static loggers: { [name: string]: debug.Debugger } = {};

  public static buildLogger(type: LoggerType) {
    const name = `${LOGGER_PREFIX}${type}`;
    if (!Logger.loggers[name]) {
      Logger.loggers[name] = debug(name);
    }
    return Logger.loggers[name];
  }
}
