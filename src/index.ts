#!/usr/bin/env node
process.env['DEBUG'] = 'openai-speech-chat:*';

import { OpenAI } from './lib/openai';
import { IncomingMessage } from 'http';
import * as debug from 'debug';

const logger = debug('openai-speech-chat:main');

const main = async () => {
  const res = await OpenAI.instance().chat('give some response with linux line break, im testing sth');
  const stream = res.data as unknown as IncomingMessage;
  // stream.pipe(process.stdout);

  let final = '';
  stream.on('data', (chunk: Buffer) => {
    const payloads = chunk.toString().split('\n\n');
    for (const payload of payloads) {
      if (payload.includes('[DONE]')) return;
      if (payload.startsWith('data:')) {
        try {
          const data = JSON.parse(payload.replace('data: ', ''));
          const chunk: undefined | string = data.choices[0].delta?.content;
          if (chunk) {
            // console.log(chunk);
            process.stdout.write(chunk);
            final += chunk;
          }
        } catch (error) {
          console.log(`Error with JSON.parse and ${payload}.\n${error}`);
        }
      }
    }
  });

  stream.on('end', () => {
    console.log();
    console.log('***');
    console.log(final);
  });

  // // console.log(typeof res);
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-ignore
  // stream.on('data', (chunk: Buffer) => {
  //   // const { data } = chunk;
  //   const data = chunk.toString();
  //   logger(data);
  //   // if (!data.startsWith('data:')) {
  //   //   logger('X |' + data);
  //   //   return;
  //   // }
  //   // const filtered = data.replace('data:', '').trim();
  //   // logger(filtered);
  //   // console.log(JSON.parse(filtered));
  //   // const message: CreateChatCompletionResponse = JSON.parse(data);
  //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //   // @ts-ignore
  //   // console.log(message.choices[0].delta.content);
  // });
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-ignore
  // stream.on('end', () => {
  //   console.log('stream done');
  // });
};

main().catch((err) => console.log(err));
