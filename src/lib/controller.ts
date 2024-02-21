import * as LibFs from 'fs';
import * as LibOs from 'os';
import * as LibPath from 'path';
import * as dayjs from 'dayjs';
import { Debugger } from 'debug';
import { Logger } from './logger';
import { OpenAIInstance, countGPTToken } from './openai';
import { Config } from './config';
import { Speech } from './speech';
import { ChatCompletionMessageParam } from 'openai/resources';
import { CliIO } from './cli';
import { ChatHistory } from './history';
import {
  ASSISTANT_TRANSLATOR_LANG_PH,
  AssistantNames,
  CliChat,
  CliChatType,
  ConfigData,
  ConfigOptionAssistant,
  CliCommands,
  Status,
  LoggerType,
  ChatOptions,
  ASSISTANT_TRANSLATOR_NAME,
  CliCommandLogOptions,
  CliCommandConfirmOptions,
  DATETIME_FORMAT,
} from './type';
import { langdetect, langfull } from './language';

export const isNumeric = (str: string) => {
  if (typeof str !== 'string') return false; // we only process strings!
  return (
    !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
};

export const countWords = (str: string): number => {
  // The \w+ metacharacter matches word characters.
  // A word character is a character a-z, A-Z, 0-9, including _ (underscore).
  const matches = str.match(/\w+/g);
  return matches ? matches.length : 0;
};

export class Controller {
  private static _instance: Controller;
  public static get instance() {
    if (!Controller._instance) {
      Controller._instance = new Controller();
    }
    return Controller._instance;
  }

  private config: ConfigData;
  private logger: Debugger;
  private cliIO: CliIO;
  private openai: OpenAIInstance;
  private speech: Speech;
  private histories: ChatHistory;
  private _status: Status;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.controller);
    this.cliIO = new CliIO();
    this.openai = OpenAIInstance.instance;
    this.speech = Speech.instance;
    this.histories = ChatHistory.instance;

    this._status = {
      model: this.config.model,
      assistant: this.config.options.optionsAssistant[0],
      tokenLimit: this.openai.calcTokenLimitAccording2Model(this.config.model),
      targetLang: this.config.options.optionsLang[0],
      rateLimit: {
        model: 'unknown',
        date: 'unknown',
        limitRequests: 'unknown',
        limitTokens: 'unknown',
        remainingRequests: 'unknown',
        remainingTokens: 'unknown',
        resetRequests: 'unknown',
        resetTokens: 'unknown',
      },
      logVerbose: this.config.logVerbose,
      needConfirm: this.config.needConfirm,
    } as Status;

    this.logger('System initialized with status: %O', this._status);
  }

  public get status(): Status {
    return this._status;
  }

  public async start() {
    await this.cmdHelp();
    return this.process();
  }

  private async process(input?: string) {
    // if original input given, use it as default value, then ask cli again
    input = (await this.cliIO.chat(input)).trim();
    if (!input) {
      // no matter from original input or cli input just now
      // wrong input, no content, skip processing
      return this.process();
    }

    if (input === CliCommands.cmd) {
      const availableCommands = Object.values(CliCommands).filter((command: string) => {
        return command !== CliCommands.cmd; // remove "cmd" itself
      });
      input = await this.cliIO.select('Select command:', availableCommands);
    }

    switch (input) {
      case CliCommands.models:
        await this.cmdModels();
        break;
      case CliCommands.assistants:
        await this.cmdAssistants();
        break;
      case CliCommands.langs:
        await this.cmdLangs();
        break;
      case CliCommands.log:
        await this.cmdLog();
        break;
      case CliCommands.temperature:
        await this.cmdTemperature();
        break;
      case CliCommands.status:
        await this.cmdStatus();
        break;
      case CliCommands.speak:
        await this.cmdSpeak();
        break;
      case CliCommands.history:
        await this.cmdHistory();
        break;
      case CliCommands.reset:
        await this.cmdReset();
        break;
      case CliCommands.save:
        await this.cmdSave();
        break;
      case CliCommands.limit:
        await this.cmdLimit();
        break;
      case CliCommands.confirm:
        await this.cmdConfirm();
        break;
      case CliCommands.help:
        await this.cmdHelp();
        break;
      case CliCommands.exit:
        process.exit(0);
        break;
      default:
        await this.chat(input);
        break;
    }

    return this.process();
  }

  private async chat(input: string) {
    const lang = langdetect(input);
    // check too short input, commonly it's mis-input
    if (!['ja', 'zh', 'ko', 'ar'].includes(lang) && countWords(input) === 1) {
      // single word input after all the commands,
      // seems not make sense, need double confirm
      if (!(await this.cliIO.confirmInput(input))) {
        return this.process(input);
      }
    }

    // double confirm input if the config is on
    if (this._status.needConfirm && !(await this.cliIO.confirmInput(input))) {
      return this.process(input);
    }

    const assistant = this._status.assistant;

    switch (assistant.name) {
      case AssistantNames.translator:
        await this.chatTranslation({ question: input });
        break;
      case AssistantNames.commonTranslated:
        const { answer: translatedQuestion } = await this.chatTranslation({ question: input });
        await this.chatText({ question: translatedQuestion });
        break;
      default:
        await this.chatText({ question: input });
        break;
    }
  }

  private async chatText(options: ChatOptions): Promise<CliChat> {
    const { question } = options;
    const need2AppendHistory = options.need2AppendHistory === undefined ? true : options.need2AppendHistory;
    const systemPrompt = options.systemPrompt || this.replacePromptPH(this._status.assistant.prompt);
    const chatType = options.chatType || CliChatType.Chat;

    const messages = this.buildAPICallMessages({
      currentQuestion: question,
      systemPrompt,
      need2AppendHistory,
    });

    const { req, res } = await this.openai.chat(messages);
    const answer = res.choices[0]?.message?.content || '';
    const history: CliChat = { question, answer, datetime: dayjs().format(DATETIME_FORMAT), req, res, type: chatType };
    this.histories.append(history);

    return history;
  }

  private async chatTranslation(options: ChatOptions): Promise<CliChat> {
    const { question } = options;
    const prompt = this.config.options.optionsAssistant
      .filter((assistant: ConfigOptionAssistant) => {
        return assistant.name === ASSISTANT_TRANSLATOR_NAME;
      })
      ?.shift().prompt;
    return this.chatText({
      question,
      systemPrompt: this.replacePromptPH(prompt),
      need2AppendHistory: false,
      chatType: CliChatType.Translation,
    });
  }

  private async cmdModels() {
    const modelName = await this.cliIO.select('Select OpenAI model:', this.config.options.optionsModel);

    // set model
    this._status.model = modelName;
    // set token limit according to model switching
    this._status.tokenLimit = this.openai.calcTokenLimitAccording2Model(modelName);
  }

  private async cmdAssistants() {
    const selectedName = await this.cliIO.select(
      'Select assistant mode:',
      this.config.options.optionsAssistant.map((assistant: ConfigOptionAssistant) => {
        return { name: assistant.name, value: assistant.name, description: assistant.description };
      }),
    );
    const selected = this.config.options.optionsAssistant
      .filter((assistant: ConfigOptionAssistant) => {
        return assistant.name === selectedName;
      })
      ?.shift();
    if (selected) {
      this._status.assistant = selected;
    }
  }

  private async cmdLangs() {
    const lang = await this.cliIO.select('Select target translation lang:', this.config.options.optionsLang);
    this._status.targetLang = lang;
  }

  private async cmdLog() {
    const logVerbose = await this.cliIO.select('Select log mode:', [
      {
        name: CliCommandLogOptions.silent,
        value: CliCommandLogOptions.silent,
        description: 'Do not log messages other than AI responses (for normal using).',
      },
      {
        name: CliCommandLogOptions.verbose,
        value: CliCommandLogOptions.verbose,
        description: 'Log request and response and debug details (for debugging purpose).',
      },
    ]);
    switch (logVerbose) {
      case CliCommandLogOptions.silent:
        this._status.logVerbose = false;
        break;
      case CliCommandLogOptions.verbose:
        this._status.logVerbose = true;
        break;
      default:
        this._status.logVerbose = false;
        break;
    }
  }

  private async cmdTemperature() {
    let input: string | number = await this.cliIO.input('Start to input the temperature [0.1 - 1.0]:');
    if (!isNumeric(input)) {
      // invalid input, no change
      return;
    }
    input = parseFloat(input);
    if (input < 0.1 || input > 1) {
      // invalid input, no change
      return;
    }
    this._status.temperature = input;
  }

  private async cmdStatus() {
    this.logger('Start to display current status ...\n%O', this._status);
  }

  private async cmdSpeak() {
    this.logger('Start to speak last chat answer ...');
    if (!this.histories.hasHistory()) {
      // no history chat to replay, go back
      this.logger('No history to speak ...');
      return;
    }

    const last: CliChat | undefined = this.histories.fetchLast();
    if (last) {
      this.speech.text2speech(last.answer);
    }
  }

  private async cmdHistory() {
    this.logger('Start to display histories ...\n%O', this.histories.fetchRaw());
  }

  private async cmdReset() {
    this.logger('Start to clear all histories ...');
    this.histories.clear();
  }

  private async cmdSave() {
    const datetime = dayjs().format(DATETIME_FORMAT);
    const timestamp = dayjs().unix();
    const basePath = LibPath.join(LibOs.homedir(), 'Downloads');

    const chatPath = LibPath.join(basePath, `chat-app.history.${datetime}.${timestamp}.json`);
    const detailPath = LibPath.join(basePath, `chat-app.history.${datetime}.${timestamp}.detail.json`);

    this.logger(`Start to save histories to local:\n${chatPath}\n${detailPath}`);
    await LibFs.promises.writeFile(chatPath, JSON.stringify(this.histories.fetchRaw(), undefined, 4));
    await LibFs.promises.writeFile(detailPath, JSON.stringify(this.histories.fetch(), undefined, 4));
  }

  private async cmdLimit() {
    this.logger('start to fetch API limit ...');
    const limit = await this.openai.fetchAPIRateLimit();
    this._status.rateLimit = limit;
  }

  private async cmdConfirm() {
    const needConfirm = await this.cliIO.select('Select confirm mode:', [
      {
        name: CliCommandConfirmOptions.need,
        value: CliCommandConfirmOptions.need,
        description: 'Need to double confirm user inputs before sending it to OpenAI API.',
      },
      {
        name: CliCommandConfirmOptions.noneed,
        value: CliCommandConfirmOptions.noneed,
        description: 'No need to double confirm user input, send it directly to OpenAI API.',
      },
    ]);
    switch (needConfirm) {
      case CliCommandConfirmOptions.need:
        this._status.needConfirm = true;
        break;
      case CliCommandConfirmOptions.noneed:
        this._status.needConfirm = false;
        break;
      default:
        this._status.needConfirm = true;
        break;
    }
  }

  private async cmdHelp() {
    console.log(this.cliIO.genMsgHelp());
  }

  private replacePromptPH(prompt: string) {
    // replace language placeholder
    const langFull = langfull(this._status.targetLang);
    const pattern = new RegExp(ASSISTANT_TRANSLATOR_LANG_PH, 'g');
    prompt = prompt.replace(pattern, langFull);

    return prompt;
  }

  private buildAPICallMessages(options: {
    currentQuestion: string;
    systemPrompt: string;
    need2AppendHistory: boolean;
  }): ChatCompletionMessageParam[] {
    const { currentQuestion, systemPrompt, need2AppendHistory } = options;

    // init message
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: currentQuestion }];

    // histories
    if (need2AppendHistory && this.histories.hasHistory()) {
      const histories = this.histories.fetch();

      let tokenTotalCount = countGPTToken(currentQuestion);

      for (let i = histories.length - 1; i >= 0; i--) {
        const chat: CliChat = histories[i];
        if (chat.type === CliChatType.Translation) {
          continue; // do not append translation content as history
        }
        const { question, answer } = chat;
        const tokenSize = countGPTToken(question + answer);
        if (tokenTotalCount + tokenSize >= this._status.tokenLimit) {
          break; // end looping, no appending any more
        }

        tokenTotalCount += tokenSize;
        messages.unshift({ role: 'assistant', content: answer });
        messages.unshift({ role: 'user', content: question });
      }
    }

    // append assitant message
    messages.unshift({ role: 'system', content: systemPrompt });

    return messages;
  }
}
