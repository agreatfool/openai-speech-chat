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
import axios, { AxiosResponse } from 'axios';

export const countGPTToken = (text: string) => {
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
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      timeout: 20 * 1000, // 20 seconds (default is 10 minutes)
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

    if (this.config.logPromptAndRes) {
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

    if (this.config.logPromptAndRes) {
      this.logger('Response: %O', chatCompletion);
    }

    return {
      req,
      res: chatCompletion,
    };
  }

  public async fetchLimit() {
    const data = {
      temperature: 0.2,
      // FIXME should be global variable, not fixed string
      model: 'gpt-3.5-turbo-0125',
      messages: [{ role: 'user', content: 'Say this is a test!' }],
    };

    const res: AxiosResponse = await axios.post(`${this.config.baseURL}/chat/completions`, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        timeout: 10 * 1000, // 10s
      },
    });

    const headers2bPrinted = {};
    for (const [key, val] of Object.entries(res.headers)) {
      if (key === 'date' || key.startsWith('x-')) {
        headers2bPrinted[key] = val;
      }
    }

    this.logger(`response status: ${res.status}`);
    this.logger(`response header: %O`, headers2bPrinted);
    this.logger(`response: %O`, res.data);
  }
}
