import * as LibPath from 'path';
import * as LibFs from 'fs';
import { parse } from 'yaml';
import { ConfigData, LoggerType } from './type';
import { Logger } from './logger';
import { Debugger } from 'debug';
import { ensureFile } from './util';

export class Config {
  private static _instance: Config;
  public static get instance() {
    if (!Config._instance) {
      Config._instance = new Config();
    }
    return Config._instance;
  }

  private logger: Debugger;
  private readonly _data: ConfigData;

  constructor() {
    this.logger = Logger.buildLogger(LoggerType.config);
    const configPath = LibPath.join(__dirname, '../../config.yaml');
    this.logger('Reading config file: %s', configPath);

    if (!ensureFile(configPath)) {
      process.exit(1);
    }
    const content = LibFs.readFileSync(configPath).toString();
    this._data = parse(content) as ConfigData;
    this.logger('Config initialized: %O', this._data);
  }

  public get data() {
    return this._data;
  }
}
