import * as tar from 'tar';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
  size?: number;
}

export async function readEntry(pack: NodeJS.ReadableStream): Promise<FileEntry | false> {
  if (!(pack as unknown as tar.Pack).writable) {
    return false;
  }

  const extract = tar.t({});
  pack.pipe(extract);

  return new Promise((resolve) => {
    extract.on('entry', (entry: tar.ReadEntry) => {
      console.log('entry linkpath', entry.header.linkpath);
      if (entry.size === 0 && entry.type === 'File') {
        resolve({
          name: entry.path,
          mode: entry.mode,
          size: entry.size,
          body: '',
        });
      }

      let body = '';
      entry.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      entry.on('end', () => {
        if (entry.type === 'File') {
          resolve({
            name: entry.path,
            mode: entry.mode,
            size: entry.size,
            body,
          });
          pack.unpipe(extract);
        }
      });
    });
  });
}
