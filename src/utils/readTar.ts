import * as tar from 'tar';

export async function readTar(pack: NodeJS.ReadableStream, callback?: (header: tar.Header, chunk: Buffer) => void) {
  const extract = tar.t({});
  pack.pipe(extract);

  extract.on('entry', (entry) => {
    let buffer = Buffer.from('');
    entry.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
    });
    entry.on('end', () => {
      if (entry.type === 'File') {
        callback?.(entry.header, Buffer.from(buffer));
      }
    });
  });

  await new Promise<void>((resolve) => {
    extract.on('finish', () => {
      resolve();
    });
  });
}
