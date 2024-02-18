import { ClientOptions, OpenAI } from 'openai';
import { Config } from './config';
import { Debugger } from 'debug';
import { Logger } from './logger';
import { TiktokenEncoding, get_encoding } from 'tiktoken';
import { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import axios, { AxiosResponse } from 'axios';
import { Controller } from './controller';
import { ConfigData, LoggerType, StatusRateLimit } from './type';

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
      timeout: 10 * 1000, // 10 seconds (default is 10 minutes)
    } as ClientOptions;
    this.logger('Init OpenAI SDK instance with: %O', configuration);
    this.openai = new OpenAI(configuration);
  }

  public calcTokenLimitAccording2Model(model: string) {
    // model: config.options.optionsModel[x]
    const modelLimit = this.config.modelTokenLimits[model] || this.config.modelTokenLimit;
    const limit = Math.floor((modelLimit - this.config.modelResponseMaxToken) * this.config.modelTokenThrottle);
    this.logger('Token limit "%d" calculated from model "%s"', limit, model);
    return limit;
  }

  public async chat(
    messages: ChatCompletionMessageParam[],
  ): Promise<{ req: ChatCompletionStreamParams; res: ChatCompletion }> {
    // see https://platform.openai.com/docs/api-reference/chat

    if (Controller.instance.status.logVerbose) {
      this.logger('API Prompt: %O', messages);
    }

    const req: ChatCompletionStreamParams = {
      model: Controller.instance.status.model,
      messages,
      temperature: Controller.instance.status.temperature,
      stream: true,
    };

    // still beta here, maybe need to be fixed in later SDK version
    const stream = await this.openai.beta.chat.completions.stream(req);

    stream.on('chunk', (chunk: ChatCompletionChunk) => {
      process.stdout.write(chunk.choices?.[0]?.delta?.content || '');
    });
    stream.on('chatCompletion', () => {
      process.stdout.write('\n');
    });

    const chatCompletion: ChatCompletion = await stream.finalChatCompletion();

    if (Controller.instance.status.logVerbose) {
      this.logger('API Response: %O', chatCompletion);
    }

    return {
      req,
      res: chatCompletion,
    };
  }

  public async fetchAPIRateLimit(): Promise<StatusRateLimit> {
    const model = Controller.instance.status.model;
    const data = {
      temperature: 0.2,
      model,
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

    this.logger(`Limit API response status: ${res.status}`);
    this.logger(`Limit API response headers: %O`, headers2bPrinted);
    this.logger(`Limit API response: %O`, res.data);

    return {
      model,
      date: headers2bPrinted['date'] || 'unknown',
      limitRequests: headers2bPrinted['x-ratelimit-limit-requests'] || 'unknown',
      limitTokens: headers2bPrinted['x-ratelimit-limit-tokens'] || 'unknown',
      remainingRequests: headers2bPrinted['x-ratelimit-remaining-requests'] || 'unknown',
      remainingTokens: headers2bPrinted['x-ratelimit-remaining-tokens'] || 'unknown',
      resetRequests: headers2bPrinted['x-ratelimit-reset-requests'] || 'unknown',
      resetTokens: headers2bPrinted['x-ratelimit-reset-tokens'] || 'unknown',
    } as StatusRateLimit;
  }
}
