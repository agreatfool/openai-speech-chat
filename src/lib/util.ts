import * as LibFs from 'fs';

export const isNumeric = (str: string) => {
  if (typeof str !== 'string') return false; // we only process strings!
  return (
    !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
};

export const countWords = (str: string): number => {
  // The \w+ metacharacter matches word characters.
  // A word character is a character a-z, A-Z, 0-9, including _ (underscore).
  const matches = str.match(/\w+/g);
  return matches ? matches.length : 0;
};

export const ensureDir = async (path: string): Promise<boolean> => {
  try {
    const stat = await LibFs.promises.stat(path);
    if (!stat.isDirectory()) {
      console.log(`Not dir: ${path}`);
      return false;
    }
  } catch (err) {
    console.log(`Error reading dir: ${path}`, err);
    return false;
  }
  return true;
};

export const ensureFile = async (path: string): Promise<boolean> => {
  try {
    const stat = await LibFs.promises.stat(path);
    if (!stat.isFile()) {
      console.log(`Not file: ${path}`);
      return false;
    }
  } catch (err) {
    console.log(`Error in reading file: ${path}`, err);
    return false;
  }
  return true;
};
