import { detect } from 'langdetect';
import { LangDetected } from './type';
import { Config } from './config';

export const langdetect = (text: string): string => {
  const detected: LangDetected[] = detect(text);

  if (!detected || !Array.isArray(detected) || detected.length === 0) {
    return Config.instance.data.options.optionsLang[0]; // default
  }

  let res: LangDetected = detected[0];
  if (detected.length > 1) {
    for (const one of detected) {
      if (one.prob > res.prob) {
        res = one; // use the prob highest one
      }
    }
  }

  const { lang } = res;

  return (lang.includes('-') ? lang.split('-').shift() : lang).toLowerCase(); // zh-cn => zh, en => en
};
