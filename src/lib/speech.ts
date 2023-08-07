import { Debugger } from 'debug';
import { Config, ConfigData } from './config';
import { langdetect } from './language';
import { Logger, LoggerType } from './logger';
import * as shell from 'shelljs';

// Speech class is using MAC OSX `say` command
// Use `say -v "?"` to see all the language options
// Use `say -v Kyoko "こんにちは"` to speak
export class Speech {
  private static _instance: Speech;
  public static get instance() {
    if (!Speech._instance) {
      Speech._instance = new Speech();
    }
    return Speech._instance;
  }

  private config: ConfigData;
  private logger: Debugger;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.speech);
  }

  public text2speech(text: string) {
    let lang = langdetect(text);
    const langOptions = Object.keys(this.config.lang);
    if (!langOptions.includes(lang)) {
      this.logger('lang detected "%s" not found in options %o, use default en');
      lang = 'en';
    }

    const voice = this.config.lang[lang];
    const command = `say -v ${voice} "${text}"`;

    console.log(command);
    shell.exec(command);
  }
}
