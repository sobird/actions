export async function replaceAllAsync(
  string: string,
  regexp: RegExp,
  replacer: (match: RegExpExecArray) => Promise<unknown>,
) {
  const matchIterator = string.matchAll(regexp);
  const results = [];
  for (const match of matchIterator) {
    results.push(replacer(match));
  }

  const replaceResults = await Promise.all(results);

  return string.replaceAll(regexp, () => {
    const item = replaceResults[0];
    replaceResults.shift();
    return item as string;
  });
}

// const regex = /\bhashFiles\s*\(([^)]*)\)/g;
// const hashstr = "${{ hashFiles('**/package-lock.json', '**/Gemfile.lock') + hash1Files('**/package-lock.json')}}";

// const replacedString = await replaceAllAsync(hashstr, regex, async (match) => {
//   const paramstr = match[1].replace(/'/g, '"');
//   const patterns = JSON.parse(`[${paramstr}]`);

//   return JSON.stringify('sdsd');
// });

// console.log('replacedString', replacedString);
