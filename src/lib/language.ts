import { detect } from 'langdetect';

interface LangDetected {
  lang: string; // 'zh-cn' | 'ja' | 'en'
  prob: number; // 0.9999999998813774
}

export const langdetect = (text: string): string => {
  const detected: LangDetected[] = detect(text);

  if (!detected || !Array.isArray(detected) || detected.length === 0) {
    return 'en';
  }

  let res: LangDetected = detected[0];
  if (detected.length > 1) {
    for (const one of detected) {
      if (one.prob > res.prob) {
        res = one; // use the prob highest one
      }
    }
  }

  const lang = res.lang;

  return (lang.includes('-') ? lang.split('-').shift() : lang).toLowerCase(); // zh-cn => zh, en => en
};
