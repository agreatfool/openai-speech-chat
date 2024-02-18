#!/usr/bin/env node
process.env['DEBUG'] = 'chat-app:*';
process.env['DEBUG_DEPTH'] = '1000';

import { Controller } from './lib/controller';

const main = async () => {
  await Controller.instance.start();
};

main().catch((err) => console.log(err));
