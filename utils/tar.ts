import * as tar from 'tar';

export async function* readEntry(pack: NodeJS.ReadableStream) {
  const extract = tar.t({});
  pack.pipe(extract);

  yield new Promise<string>((resolve) => {
    extract.on('entry', (entry) => {
      let content = '';
      entry.on('data', (chunk: Buffer) => {
        content += chunk;
      });
      entry.on('end', () => {
        if (entry.type === 'File') {
          resolve(content);
        }
      });
    });

    // extract.on('finish', () => {
    //   resolve();
    // });
  });
}
