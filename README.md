# openai-speech-chat

## Overview

The main purpose of this project are:

- Make ChatGPT (OpenAI) easy to use
  - make it easily been used in CLI mode
  - make it less memory occupied (no need to start a browser for it)
- I'm learning new language, I want to make it easy to ask translation questions

## Config

Rename `config.yaml.example` to `config.yaml`, and edit it.

```yaml
apiKey: # put your chatgpt apikey here
model: gpt-3.5-turbo-16k # see https://platform.openai.com/docs/models
temperature: 0.8 # What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
useProxy: true # whether call chatgpt API over proxy
proxyUrl: http://127.0.0.1:6152 # proxy setting
maxHistory: 100 # max chat history to save in node.js process memory
lang: # say command voice config, format: "lang: voice", all voice options `say -v "?"`
  zh: Meijia
  en: Samantha
  ja: Kyoko
translate2: japanese # the translation target language, in translation mode, no matter what you input, it would be sent to chatgpt to be translated into this lanuage
```

## Install & Usage

### Install

```
$ git clone https://github.com/agreatfool/openai-speech-chat.git
$ cd openai-speech-chat
$ npm install && npm run build
```

### Usage

Execute `openai-speech-chat` directly after installing.

```
$ openai-speech-chat
? Input the chat text.
Input "cx" to switch to text chat mode.
Input "ct" to switch to target language translate mode.
Input "ca" to switch to target language chat mode.
Input "cr" to replay last chat answer in speech.
Input "cs" to save chat history to disk.
Chat:
```

Some commands could be used:

- type `cx` in the Chat input, to switch to text chat mode (default mode)
  - talk with ChatGPT with text input
- type `ct` in the Chat input, to switch to translation mode
  - input anything in the Chat input, it would be translated into target language (settings in the config file)
- type `ca` in the Chat input, to switch to translation and chat mode
  - input anything in the Chat input, it would be translated into target language and this translated input would be sent to ChatGPT to chat
- type `cr` in the Chat input, would call `say` command to Text-to-Speech the last answer from ChatGPT
- type `cs` in the Chat input, would save all the history chats data into `~/Downloads/openai-speech-chat.chat-history.${dayjs().unix()}.json`

## Speech Solution

I use all MAC OSX solution to do speech, rather than using some SAAS API.

- Text-to-Speech
  - MAC OSX `say` command
- Speech-to-Text
  - MAC OSX `dictation` functionality
  - This means `openai-speech-chat` will always accept text input, MAC dictation could convert the speech to text

## ~~Google Cloud - Text-to-Speech~~

```
As google cloud API are all paid to use, I will not use them.
Now switch to MAC OSX "say" command.
```

- website: https://cloud.google.com/text-to-speech/docs
- free trial plan: https://cloud.google.com/free/docs/free-cloud-features
- billing: https://cloud.google.com/billing/docs/how-to/modify-project
- limit: https://cloud.google.com/text-to-speech/quotas
- tutorial: https://cloud.google.com/text-to-speech/docs/create-audio-text-client-libraries

Basic account

```
byte limit for each request: 5000
requests per minutes: 1000
```
