import { Debugger } from 'debug';
import { Config } from './config';
import { langdetect } from './language';
import { Logger } from './logger';
import * as shell from 'shelljs';
import { ConfigData, LoggerType } from './type';

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
    const vocalOptions = Object.keys(this.config.langVocal);
    if (!vocalOptions.includes(lang)) {
      this.logger('lang detected "%s" not found in vocal options %o, use en', lang, vocalOptions);
      lang = 'en';
    }

    const voice = this.config.langVocal[lang];
    const command = `say -v ${voice} "${text}"`;

    this.logger('speech cmd: %s', command);
    shell.exec(command);
  }
}
