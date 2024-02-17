import { ClientOptions, OpenAI } from 'openai';
import { Config, ConfigData } from './config';
import { Debugger } from 'debug';
import { Logger, LoggerType } from './logger';
import { TiktokenEncoding, get_encoding } from 'tiktoken';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';

export const gptTokenAmountCalc = (text: string) => {
  // see https://platform.openai.com/tokenizer
  const encoding = get_encoding('cl100k_base' as TiktokenEncoding);
  const encoded = encoding.encode(text);
  return encoded.length;
};

export class OpenAIInstance {
  private static _instance: OpenAIInstance;
  public static get instance() {
    if (!OpenAIInstance._instance) {
      OpenAIInstance._instance = new OpenAIInstance();
    }
    return OpenAIInstance._instance;
  }

  private config: ConfigData;
  private openai: OpenAI;
  private logger: Debugger;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.openai);
    const configuration = {
      baseURL: this.config.basePath,
      apiKey: this.config.apiKey,
    } as ClientOptions;
    this.openai = new OpenAI(configuration);
  }

  public async chat(
    question: string,
    histories?: ChatCompletionMessageParam[],
  ): Promise<{ req: ChatCompletionStreamParams; res: ChatCompletion }> {
    // see https://platform.openai.com/docs/api-reference/chat
    let messages: ChatCompletionMessageParam[];
    if (histories) {
      messages = [...histories, { role: 'user', content: question } as ChatCompletionUserMessageParam];
    } else {
      messages = [{ role: 'user', content: question }];
    }

    if (this.config.logPrompt) {
      this.logger('Prompt: %O', messages);
    }

    const req: ChatCompletionStreamParams = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      stream: true,
    };

    const stream = await this.openai.beta.chat.completions.stream(req);

    stream.on('chunk', (chunk: ChatCompletionChunk) => {
      process.stdout.write(chunk.choices?.[0]?.delta?.content || '');
    });
    stream.on('chatCompletion', () => {
      process.stdout.write('\n');
    });

    const chatCompletion = await stream.finalChatCompletion();

    if (this.config.logPrompt) {
      this.logger('Response: %O', chatCompletion);
    }

    return {
      req,
      res: chatCompletion,
    };
  }
}
