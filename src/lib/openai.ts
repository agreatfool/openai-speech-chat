import { Configuration, CreateChatCompletionRequest, CreateChatCompletionResponse, OpenAIApi } from 'openai';
import { Config, ConfigData } from './config';
import { AxiosError, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Debugger } from 'debug';
import { Logger, LoggerType } from './logger';

export class OpenAI {
  private static _instance: OpenAI;
  public static instance() {
    if (!OpenAI._instance) {
      OpenAI._instance = new OpenAI();
    }
    return OpenAI._instance;
  }

  private config: ConfigData;
  private openai: OpenAIApi;
  private logger: Debugger;

  constructor() {
    this.config = Config.instance().data;
    this.logger = Logger.buildLogger(LoggerType.error);
    const configuration = new Configuration({
      apiKey: this.config.apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async chat(question: string): Promise<AxiosResponse<CreateChatCompletionResponse, any>> {
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
      // const res = await this.openai.createChatCompletion(req, axiosConfig);
      // return res.data;
    } catch (error) {
      let status = -1;
      let message = 'failed';

      // console.log(error);
      // console.log(isAxiosError(error));

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

      // return {
      //   id: 'chatcmpl-7kWeu25HxWK10Tag5hmb4F5e6RsTA',
      //   object: 'chat.completion',
      //   created: -1,
      //   model: this.config.model,
      //   choices: [{ index: 0, message: { role: 'user', content: message } }],
      // };
    }
  }
}
