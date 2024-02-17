import * as LibPath from 'path';
import * as LibFs from 'fs';
import { parse } from 'yaml';

export interface ConfigData {
  apiKey: string; // see: https://platform.openai.com/account/api-keys

  temperature: number; // 0.2
  baseURL: string;
  useProxy: boolean;
  proxyUrl: string;
  maxHistory: number;

  model: string; // see: https://platform.openai.com/docs/models
  modelTokenLimit: number;
  modelTokenThrottle: number; // 0.8 means "80% of modelTokenLimit"
  models: string[];
  modelResponseMaxToken: number;
  modelTokenLimits: { [modelName: string]: number };

  options: {
    optionsAssistant: { [assistantName: string]: string };
    optionsLang: string[];
  };
  logPromptAndRes: boolean;
  langVocal: { [lang: string]: string }; // { zh: "Meijia" }
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
