import { Config } from './config';
import { ConfigData, CliChat, CliChatBase } from './type';

export class ChatHistory {
  private static _instance: ChatHistory;
  public static get instance() {
    if (!ChatHistory._instance) {
      ChatHistory._instance = new ChatHistory();
    }
    return ChatHistory._instance;
  }

  private config: ConfigData;
  private histories: CliChat[];

  constructor() {
    this.config = Config.instance.data;
    this.histories = [] as CliChat[];
  }

  public hasHistory(): boolean {
    return this.histories.length > 0;
  }

  public fetchLast(): CliChat | undefined {
    if (this.histories.length > 0) {
      return this.histories[this.histories.length - 1];
    } else {
      return undefined;
    }
  }

  public fetch(): CliChat[] {
    return this.histories;
  }

  public fetchRaw(): CliChatBase[] {
    return this.histories.map((history: CliChat) => {
      return { question: history.question, answer: history.answer, type: history.type, datetime: history.datetime };
    });
  }

  public append(history: CliChat) {
    if (this.histories.length >= this.config.maxHistory) {
      this.histories.shift();
    }
    this.histories.push(history);
  }

  public clear() {
    this.histories = [];
  }

  public recover(data: CliChat[]) {
    this.histories = data;
  }
}
