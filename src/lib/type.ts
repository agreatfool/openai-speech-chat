import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { ChatCompletion } from 'openai/resources';

export interface ChatOptions {
  question: string;
  need2AppendHistory?: boolean;
  systemPrompt?: string;
  chatType?: CliChatType;
}

export enum LoggerType {
  config = 'config',
  controller = 'controller',
  openai = 'openai',
  speech = 'speech',
}

export const LOGGER_PREFIX = 'chat-app:';

export interface ConfigData {
  apiKey: string; // see: https://platform.openai.com/account/api-keys

  vaultDir: string;

  temperature: number; // 0.2
  baseURL: string;
  useProxy: boolean;
  proxyUrl: string;
  maxHistory: number;

  model: string; // see: https://platform.openai.com/docs/models
  modelTokenLimit: number;
  modelTokenThrottle: number; // 0.8 means "80% of modelTokenLimit"
  modelResponseMaxToken: number;
  modelTokenLimits: { [modelName: string]: number };

  options: {
    optionsModel: string[];
    optionsAssistant: ConfigOptionAssistant[];
    optionsLang: string[];
  };
  langVocal: { [lang: string]: string }; // { zh: "Meijia" }
  logVerbose: boolean;
  needConfirm: boolean;
}

export interface ConfigOptionAssistant {
  name: string;
  prompt: string;
  description: string;
}

export const ASSISTANT_TRANSLATOR_LANG_PH = '{LANG}';
export const ASSISTANT_COMMON_NAME = 'common';
export const ASSISTANT_TRANSLATOR_NAME = 'translator';

export const DATETIME_FORMAT = 'YYYY-MM-DD_HH-mm-ss';

export interface CliChatBase {
  question: string;
  answer: string;
  type: CliChatType;
  datetime: string;
}

export interface CliChat extends CliChatBase {
  req: ChatCompletionStreamParams;
  res: ChatCompletion;
}

export interface CliChatHistoryFile {
  summary: string;
  history: CliChatBase[];
}

export enum CliCommands {
  help = 'help',
  assistants = 'assistants',
  langs = 'langs',
  models = 'models',
  speak = 'speak',
  reprint = 'reprint',
  session = 'session',
  historyList = 'historyList',
  historyLoad = 'historyLoad',
  status = 'status',
  limit = 'limit',
  save = 'save',
  reset = 'reset',
  log = 'log',
  confirm = 'confirm',
  temperature = 'temperature',
  exit = 'exit',
  cmd = 'cmd',
}

export enum CliCommandLogOptions {
  silent = 'silent',
  verbose = 'verbose',
}

export enum CliCommandConfirmOptions {
  need = 'need',
  noneed = 'noneed',
}

export interface CliSelectOption {
  name: string;
  value: string;
  description?: string;
}

export enum CliChatType {
  Chat = 'Chat',
  Translation = 'Translation',
  Summary = 'Summary',
}

export enum AssistantNames {
  common = 'common',
  translator = 'translator',
  commonTranslated = 'commonTranslated',
  commonLang = 'commonLang',
  chat = 'chat',
  chatTranslated = 'chatTranslated',
}

export interface Status {
  model: string; // config.options.optionsModel[x]
  temperature: number;
  assistant: ConfigOptionAssistant; // config.options.optionsAssistant[x]
  tokenLimit: number; // token limit calculated for current model
  targetLang: string; // config.options.optionsLang[x] target language for translating
  rateLimit: StatusRateLimit;
  logVerbose: boolean;
  needConfirm: boolean;
}

export interface StatusRateLimit {
  model: string;
  date: string;
  limitRequests: string; // default 'unknown'
  limitTokens: string;
  remainingRequests: string;
  remainingTokens: string;
  resetRequests: string;
  resetTokens: string;
}

export interface LangDetected {
  lang: string; // 'zh-cn' | 'ja' | 'en'
  prob: number; // 0.9999999998813774
}

export interface HistoryListTableData {
  timestamp: string;
  file: CliChatHistoryFile;
}
