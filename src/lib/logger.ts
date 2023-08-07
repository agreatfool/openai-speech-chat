import * as debug from 'debug';

const LOGGER_PREFIX = 'openai-speech-chat:';

export enum LoggerType {
  controller = 'controller',
  openai = 'openai',
  speech = 'speech',
}

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
