// oxlint-disable no-unused-vars
import fs from 'node:fs';
import fsP from 'node:fs/promises';

import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';

import { LogRow } from '@/gen/runner/v1/messages_pb';

const MaxLineSize = 64 * 1024;
const DBFSPrefix = 'logs/';
const timeFormat = '2006-01-02T15:04:05.0000000Z07:00';
const defaultBufSize = MaxLineSize;

// oxlint-disable-next-line typescript/no-extraneous-class
class Log {
  static async write(filename: string, offset: number, rows: LogRow[]) {
    let flags = 'w';
    if (offset !== 0) {
      flags = 'r+';
    }
    const name = DBFSPrefix + filename;
    const fd = await fsP.open(name, flags);

    const stat = await fd.stat();

    if (stat.size < offset) {
      throw Error(`size of ${name} is less than offset`);
    }

    // if (offset === 0) {
    //   await fd.write(Buffer.alloc(0), 0, undefined, 0);
    // }

    fs.createWriteStream(name, { fd });

    const ns = [];
    for await (const row of rows) {
      const line = `${this.format(timestampDate(row.time || timestampFromDate(new Date())), row.content)}\n`;
      const n = await fd.write(Buffer.from(line), offset, line.length, null);
      ns.push(n);
    }
    await fd.close();
    return ns;
  }

  static read(filename: string, offset: number, limit: number) {}

  static format(timestamp: Date, content: string) {
    let log = content.split('\n').join('\\n');
    if (log.length > MaxLineSize) {
      log = content.substring(0, MaxLineSize);
    }

    return `${timestamp.toUTCString()} ${log}`;
  }
}

export default Log;
