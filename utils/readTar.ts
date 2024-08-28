import * as tar from 'tar';

export async function readTar(pack: NodeJS.ReadableStream, callback?: (header: tar.Header, chunk: Buffer) => void) {
  const extract = tar.t({});
  pack.pipe(extract);

  extract.on('entry', (stream) => {
    let content = Buffer.from('');
    stream.on('data', (chunk: Buffer) => {
      content = Buffer.concat([content, chunk]);
    });
    stream.on('end', () => {
      callback?.(stream.header, content);
    });
  });

  return new Promise<void>((resolve) => {
    extract.on('end', () => {
      resolve();
    });
  });
}
