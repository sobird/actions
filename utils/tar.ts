import * as tar from 'tar';

export async function readEntry(pack: NodeJS.ReadableStream) {
  const extract = tar.t({});
  pack.pipe(extract);

  return new Promise<string>((resolve) => {
    extract.on('entry', (entry: tar.ReadEntry) => {
      pack.unpipe(extract);
      entry.pause();
      console.log('entry123', entry);
      setTimeout(() => {
        console.log('entry456', entry);
        resolve(entry);
      }, 100);

      // let content = '';
      // entry.on('data', (chunk: Buffer) => {
      //   content += chunk;
      // });
      // entry.on('end', () => {
      //   if (entry.type === 'File') {
      //     // console.log('entry', entry);

      //     resolve(content);
      //     pack.unpipe(extract);
      //   }
      // });
    });

    // extract.on('finish', () => {
    //   resolve();
    // });
  });
}
