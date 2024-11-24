import fs from 'node:fs';
import fsP from 'node:fs/promises';

import { Timestamp } from '@bufbuild/protobuf';

import { LogRow } from '@/pkg/service/runner/v1/messages_pb';

const MaxLineSize = 64 * 1024;
const DBFSPrefix = 'logs/';
const timeFormat = '2006-01-02T15:04:05.0000000Z07:00';
const defaultBufSize = MaxLineSize;

class Log {
  static async write(filename: string, offset: number, rows: LogRow[]) {
    let flag = 'w';
    if (offset !== 0) {
      flag = 'r+';
    }
    const name = DBFSPrefix + filename;
    const fd = await fsP.open(name, flag);

    const stat = await fd.stat();
    console.log('stat', stat);

    // if (offset === 0) {
    //   await fd.write(Buffer.alloc(0), 0, undefined, 0);
    // }

    fs.createWriteStream(name, { fd });

    const ns = [];
    for await (const row of rows) {
      const line = `${this.format(row.time!.toDate(), row.content)}\n`;
      const n = await fd.write(Buffer.from(line), 0, line.length, null);
      ns.push(n);
    }
    await fd.close();
    return ns;
  }

  static format(timestamp: Date, content: string) {
    let log = content.split('\n').join('\\n');
    if (log.length > MaxLineSize) {
      log = content.substring(0, MaxLineSize);
    }

    return `${timestamp.toUTCString()} ${log}`;
  }
}

export default Log;

const rows = [
  { time: Timestamp.fromDate(new Date('2022-01-01T12:00:00Z')), content: 'Log entry 1' },
  { time: Timestamp.fromDate(new Date('2022-01-01T12:00:01Z')), content: 'Log entry 2' },
];

await Log.write('example.log', 2, rows.map((item) => { return new LogRow(item); }));
