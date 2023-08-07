import * as LibPath from 'path';
import * as LibFs from 'fs';
import { parse } from 'yaml';

export interface ConfigData {
  apiKey: string; // see: https://platform.openai.com/account/api-keys
  model: string; // see: https://platform.openai.com/docs/models
  temperature: number;
  useProxy: boolean;
  proxyUrl: string;
  maxHistory: number;
  lang: { [lang: string]: string }; // { zh: "Meijia" }
  translate2: string;
}

export class Config {
  private static _instance: Config;
  public static get instance() {
    if (!Config._instance) {
      Config._instance = new Config();
    }
    return Config._instance;
  }

  private readonly _data: ConfigData;

  constructor() {
    const configPath = LibPath.join(__dirname, '../../config.yaml');
    const content = LibFs.readFileSync(configPath).toString();
    this._data = parse(content) as ConfigData;
  }

  public get data() {
    return this._data;
  }
}
