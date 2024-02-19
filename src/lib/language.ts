import { detect } from 'langdetect';
import { LangDetected } from './type';
import { Config } from './config';

const ISO6391 = require('iso-639-1');

export const langdetect = (text: string): string => {
  const detected: LangDetected[] = detect(text);

  if (!detected || !Array.isArray(detected) || detected.length === 0) {
    return Config.instance.data.options.optionsLang[0]; // default
  }

  let res: LangDetected = detected[0];
  if (detected.length > 1) {
    for (const final of detected) {
      if (final.prob > res.prob) {
        res = final; // use the prob highest one
      }
    }
  }

  const { lang } = res;

  return (lang.includes('-') ? lang.split('-').shift() : lang).toLowerCase(); // zh-cn => zh, en => en
};

export const langfull = (lang: string): string => {
  return ISO6391.getName(lang); // ja => japanese, en => english
};
