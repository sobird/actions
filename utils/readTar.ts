import * as tar from 'tar';

export async function readTar(pack: NodeJS.ReadableStream, callback?: (header: tar.Header, chunk: Buffer) => void) {
  const extract = tar.t({});
  pack.pipe(extract);

  extract.on('entry', (entry) => {
    const buffer = Buffer.from('');
    entry.on('data', (chunk: Buffer) => {
      Buffer.concat([buffer, chunk]);
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
