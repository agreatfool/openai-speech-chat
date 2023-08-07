#!/usr/bin/env node
process.env['DEBUG'] = 'openai-speech-chat:*';

import { Controller } from './lib/controller';

const main = async () => {
  await Controller.instance.start();
};

main().catch((err) => console.log(err));
