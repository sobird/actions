import tar from 'tar-stream';

export async function readTar(pack: NodeJS.ReadableStream, callback?: (header: tar.Headers, chunk: Buffer) => void) {
  const extract = tar.extract();
  pack.pipe(extract);

  extract.on('entry', (header, stream, next) => {
    let content = Buffer.from('');
    stream.on('data', (chunk: Buffer) => {
      content = Buffer.concat([content, chunk]);
    });
    stream.on('end', () => {
      callback?.(header, content);
      next(); // ready for next entry
    });
  });

  return new Promise<void>((resolve) => {
    extract.on('finish', () => {
      resolve();
    });
  });
}
