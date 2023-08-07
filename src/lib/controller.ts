import * as LibFs from 'fs';
import * as LibOs from 'os';
import * as LibPath from 'path';
import * as dayjs from 'dayjs';
import { input } from '@inquirer/prompts';
import { Debugger } from 'debug';
import { Logger, LoggerType } from './logger';
import { OpenAI, handleChatRes } from './openai';
import { Config, ConfigData } from './config';
import { Speech } from './speech';

export interface Chat {
  question: string;
  answer: string;
}

export enum ChatQuestionPattern {
  ChatText = 'cx',
  ChatTranslation = 'ct',
  ChatReplay = 'cr',
  ChatSave = 'cs',
}

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
  private history: Chat[];
  private openai: OpenAI;
  private speech: Speech;
  private pattern: ChatQuestionPattern;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.controller);
    this.history = [];
    this.openai = OpenAI.instance;
    this.speech = Speech.instance;
    this.pattern = ChatQuestionPattern.ChatText;
  }

  public async start() {
    return this.chat();
  }

  private async chat() {
    const question = await input({ message: this.genChatHint() });
    if (!question) {
      return this.chat();
    }
    if (question === ChatQuestionPattern.ChatReplay) {
      return this.chatReplay();
    }
    if (question === ChatQuestionPattern.ChatSave) {
      return this.saveChatToFile();
    }

    switch (question) {
      case ChatQuestionPattern.ChatText:
        this.pattern = ChatQuestionPattern.ChatText;
        this.logger('Swtich pattern to "ChatText" ...');
        return this.chat();
      case ChatQuestionPattern.ChatTranslation:
        this.pattern = ChatQuestionPattern.ChatTranslation;
        this.logger('Swtich pattern to "ChatTranslation" ...');
        return this.chat();
      default:
        // do nothing
        break;
    }

    switch (this.pattern) {
      case ChatQuestionPattern.ChatText:
        const chat1 = await this.chatText(question);
        this.saveChatInMemory(chat1);
        this.logger('Chat saved ...');
        return this.chat();
      case ChatQuestionPattern.ChatTranslation:
        const chat2 = await this.chatTranslation(question);
        this.saveChatInMemory(chat2);
        this.logger('Chat saved ...');
        return this.chat();
      default:
        const chat3 = await this.chatText(question);
        this.saveChatInMemory(chat3);
        this.logger('Chat saved ...');
        return this.chat();
    }
  }

  private async chatTranslation(question: string) {
    const translationQuestion = `Please translate "${question}" to ${this.config.translate2}`;
    const chat = await this.chatText(translationQuestion);
    this.saveChatInMemory(chat);
    return this.chatText(chat.answer);
  }

  private async chatText(question: string): Promise<Chat> {
    const res = await this.openai.chat(question);
    let answer = '';
    await handleChatRes(
      res,
      (chunk: string) => {
        process.stdout.write(chunk);
        answer += chunk;
      },
      () => {
        console.log('\n');
      },
    );
    answer += '\n';

    return { question, answer };
  }

  private async chatReplay() {
    this.logger('Start to replay last chat answer ...');
    if (this.history.length === 0) {
      // no history chat to replay, go back
      this.logger('No history to replay ...');
      return this.chat();
    }

    const last = this.history[this.history.length - 1];

    this.speech.text2speech(last.answer);

    return this.chat();
  }

  private saveChatInMemory(chat: Chat) {
    if (this.history.length === this.config.maxHistory) {
      this.history.shift(); // remove the first one
    }
    this.history.push(chat);
  }

  private async saveChatToFile() {
    const filePath = LibPath.join(
      LibOs.homedir(),
      'Downloads',
      `openai-speech-chat.chat-history.${dayjs().unix()}.json`,
    );
    await LibFs.promises.writeFile(filePath, JSON.stringify(this.history, undefined, 4));
    return this.chat();
  }

  private genChatHint() {
    let hint = '';

    hint += 'Input the chat text.\n';
    hint += 'Input "cx" to switch to text chat mode.\n';
    hint += 'Input "ct" to switch to target language chat mode.\n';
    hint += 'Input "cr" to replay last chat answer in speech.\n';
    hint += 'Input "cs" to save chat history to disk.\n';
    hint += 'Chat:';

    return hint;
  }
}
