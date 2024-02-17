import * as LibFs from 'fs';
import * as LibOs from 'os';
import * as LibPath from 'path';
import * as dayjs from 'dayjs';
import { input } from '@inquirer/prompts';
import { Debugger } from 'debug';
import { Logger, LoggerType } from './logger';
import { OpenAIInstance, gptTokenAmountCalc } from './openai';
import { Config, ConfigData } from './config';
import { Speech } from './speech';
import { langdetect } from './language';
import { ChatCompletionMessageParam } from 'openai/resources';

const ISO6391 = require('iso-639-1');

export interface Chat {
  question: string;
  answer: string;
}

export interface ChatHistory extends Chat {
  type: ChatHistoryType;
}

export enum ChatQuestionPattern {
  ChatText = 'cx',
  ChatTranslation = 'ct',
  ChatTranslationAndAnswer = 'ca',
  ChatReplay = 'cr',
  ChatSave = 'cs',
}

export enum ChatHistoryType {
  Chat = 'Chat',
  Translation = 'Translation',
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
  private histories: ChatHistory[];
  private openai: OpenAIInstance;
  private speech: Speech;
  private pattern: ChatQuestionPattern;
  private tokenLimit: number;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.controller);
    this.histories = [];
    this.openai = OpenAIInstance.instance;
    this.speech = Speech.instance;
    this.pattern = ChatQuestionPattern.ChatText;
    this.tokenLimit = this.config.modelTokenLimit * this.config.modelTokenThrottle;
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
      await this.chatReplay();
      return this.chat();
    }
    if (question === ChatQuestionPattern.ChatSave) {
      await this.saveChatToFile();
      return this.chat();
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
      case ChatQuestionPattern.ChatTranslationAndAnswer:
        this.pattern = ChatQuestionPattern.ChatTranslationAndAnswer;
        this.logger('Swtich pattern to "ChatTranslationAndAnswer" ...');
        this.logger('Swtich to human being like chat mode, remove old histories ...');
        if (this.histories.length > 0) await this.saveChatToFile();
        this.histories = [];
        return this.chat();
      default:
        // do nothing
        break;
    }

    switch (this.pattern) {
      case ChatQuestionPattern.ChatText:
        const chat1 = await this.chatText(question);
        this.saveChatInMemory(chat1, ChatHistoryType.Chat);
        this.logger('Chat saved ...');
        return this.chat();
      case ChatQuestionPattern.ChatTranslationAndAnswer:
        const chat2 = await this.chatTranslationAndAnswer(question);
        this.saveChatInMemory(chat2, ChatHistoryType.Chat);
        this.logger('Chat saved ...');
        return this.chat();
      case ChatQuestionPattern.ChatTranslation:
        const chat3 = await this.chatTranslation(question);
        this.saveChatInMemory(chat3, ChatHistoryType.Translation);
        this.logger('Chat saved ...');
        return this.chat();
      default:
        const chat4 = await this.chatText(question);
        this.saveChatInMemory(chat4, ChatHistoryType.Chat);
        this.logger('Chat saved ...');
        return this.chat();
    }
  }

  private async chatTranslation(question: string) {
    const translationQuestion = this.makeTranslationQuestion(question);
    return this.chatText(translationQuestion, this.makeTranslationContext());
  }

  private async chatTranslationAndAnswer(question: string) {
    let translatedQuestion = question;
    const lang = langdetect(question);
    if (lang !== this.config.translate2) {
      const translationQuestion = this.makeTranslationQuestion(question);
      const chat = await this.chatText(translationQuestion, this.makeTranslationContext());
      this.saveChatInMemory(chat, ChatHistoryType.Translation);
      translatedQuestion = chat.answer;
    }

    return this.chatText(translatedQuestion, [
      ...this.makeHumanChatContext(),
      ...this.makeHistories(translatedQuestion),
    ]);
  }

  private async chatText(question: string, histories?: ChatCompletionMessageParam[]): Promise<Chat> {
    histories = histories || this.makeHistories(question);
    if (Array.isArray(histories) && histories.length === 0) histories = undefined;

    const { res } = await this.openai.chat(question, histories);
    const answer = res.choices?.[0]?.message?.content || '';

    return { question, answer } as Chat;
  }

  private async chatReplay() {
    this.logger('Start to replay last chat answer ...');
    if (this.histories.length === 0) {
      // no history chat to replay, go back
      this.logger('No history to replay ...');
      return;
    }

    const last = this.histories[this.histories.length - 1];

    this.speech.text2speech(last.answer);
  }

  private saveChatInMemory(chat: Chat, type: ChatHistoryType) {
    if (this.histories.length === this.config.maxHistory) {
      this.histories.shift(); // remove the first one
    }
    this.histories.push({ ...chat, ...{ type } });
  }

  private async saveChatToFile() {
    const filePath = LibPath.join(
      LibOs.homedir(),
      'Downloads',
      `openai-speech-chat.chat-history.${dayjs().unix()}.json`,
    );
    await LibFs.promises.writeFile(filePath, JSON.stringify(this.histories, undefined, 4));
  }

  private makeTranslationContext(): ChatCompletionMessageParam[] {
    return [
      {
        role: 'system',
        content: 'You are a helpful translator.',
      },
    ];
  }

  private makeHumanChatContext(): ChatCompletionMessageParam[] {
    return [
      {
        role: 'system',
        content: `Please chat with me like a human being. Make sure you will reply questions in ${ISO6391.getName(
          this.config.translate2,
        )}.`,
      },
    ];
  }

  private makeHistories(currentQuestion: string): ChatCompletionMessageParam[] {
    if (this.histories.length === 0) {
      return [];
    }

    const histories: ChatCompletionMessageParam[] = [];
    let tokenTotalSize = gptTokenAmountCalc(currentQuestion);

    let sysHistoryAdded = false;

    for (let i = this.histories.length - 1; i >= 0; i--) {
      const chat: ChatHistory = this.histories[i];
      if (chat.type === ChatHistoryType.Translation) {
        continue; // skip translation type history
      }
      const { question, answer } = chat;
      const tokenSize = gptTokenAmountCalc(question + answer);
      if (tokenTotalSize + tokenSize >= this.tokenLimit) {
        break; // end looping
      }
      tokenTotalSize += tokenSize;

      if (i === 0) {
        sysHistoryAdded = true;
      }
      histories.unshift({ role: 'assistant', content: answer });
      histories.unshift({ role: 'user', content: question });
    }

    if (!sysHistoryAdded) {
      // system here
      // {"role": "system", "content": "You are a helpful assistant."},
    }

    return histories;
  }

  private makeTranslationQuestion(question: string) {
    return `Please translate "${question}" to ${ISO6391.getName(this.config.translate2)}`;
  }

  private genChatHint() {
    let hint = '';

    hint += `Input the chat text (mode: ${this.pattern}).\n`;
    hint += 'Input "cx" to switch to text chat mode.\n';
    hint += 'Input "ct" to switch to target language translate mode.\n';
    hint += 'Input "ca" to switch to target language chat mode.\n';
    hint += 'Input "cr" to replay last chat answer in speech.\n';
    hint += 'Input "cs" to save chat history to disk.\n';
    hint += 'Chat:';

    return hint;
  }
}
