import { Configuration, CreateChatCompletionRequest, CreateChatCompletionResponse, OpenAIApi } from 'openai';
import { Config, ConfigData } from './config';
import { AxiosError, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Debugger } from 'debug';
import { Logger, LoggerType } from './logger';
import { IncomingMessage } from 'http';

export const handleChatRes = (
  res: AxiosResponse<CreateChatCompletionResponse>,
  handle: (chunk: string | undefined) => void,
  end?: () => void,
) => {
  return new Promise((resolve) => {
    const stream = res.data as unknown as IncomingMessage;

    stream.on('data', (chunk: Buffer) => {
      const payloads = chunk.toString().split('\n\n');
      for (const payload of payloads) {
        if (payload.includes('[DONE]')) {
          // end message, ignore it
          return;
        }
        if (payload.startsWith('data:')) {
          try {
            const data = JSON.parse(payload.replace('data: ', ''));
            const chunk: undefined | string = data.choices[0]?.delta?.content;
            if (chunk) {
              handle(chunk);
            }
          } catch (error) {
            Logger.buildLogger(LoggerType.openai)('Error when JSON.parse "%s". \nerror:\n%O', payload, error);
          }
        }
      }
    });

    stream.on('end', () => {
      if (end) {
        end();
      }
      resolve(undefined);
    });
  });
};

export class OpenAI {
  private static _instance: OpenAI;
  public static get instance() {
    if (!OpenAI._instance) {
      OpenAI._instance = new OpenAI();
    }
    return OpenAI._instance;
  }

  private config: ConfigData;
  private openai: OpenAIApi;
  private logger: Debugger;

  constructor() {
    this.config = Config.instance.data;
    this.logger = Logger.buildLogger(LoggerType.openai);
    const configuration = new Configuration({
      apiKey: this.config.apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  public async chat(question: string): Promise<AxiosResponse<CreateChatCompletionResponse>> {
    const req: CreateChatCompletionRequest = {
      model: this.config.model,
      messages: [{ role: 'user', content: question }],
      temperature: this.config.temperature,
      stream: true,
    };

    const axiosConfig: AxiosRequestConfig = { responseType: 'stream' };
    if (this.config.useProxy) {
      axiosConfig.httpAgent = new HttpsProxyAgent(this.config.proxyUrl);
      axiosConfig.httpsAgent = axiosConfig.httpAgent;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return this.openai.createChatCompletion(req, axiosConfig);
    } catch (error) {
      let status = -1;
      let message = 'failed';

      if (isAxiosError(error)) {
        const err: AxiosError<string> = error;
        const response = err.response;
        status = response ? response.status : -1;
        message = response ? JSON.stringify(response.data) : error.message;
        this.logger('OpenAI request failed, status: %d, data: %s', status, message);
      } else {
        const err: Error = error;
        message = err.message;
        this.logger('OpenAI request failed, status: -1, data: %s', message);
      }

      // we will still throw the error after logging
      throw error;
    }
  }
}
