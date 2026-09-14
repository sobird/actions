import fs from 'node:fs';

import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';

import { LogRow } from '@/gen/runner/v1/messages_pb';
import dbfs from '@/services/dbfs';
import type DbFile from '@/services/dbfs/file';

import storage from './storage';

const MaxLineSize = 64 * 1024;

/** Render a timestamp the way upstream does: RFC3339 UTC with 7 fractional digits. */
function formatTimestamp(date: Date): string {
  // toISOString() gives millisecond precision; pad out to 7 digits to match Go's
  // '2006-01-02T15:04:05.0000000Z07:00'.
  return `${date.toISOString().slice(0, -1)}0000Z`;
}

// oxlint-disable-next-line typescript/no-extraneous-class
class Log {
  /**
   * Append rows to a task's log file at the given byte offset.
   *
   * @param filename path returned by {@link logFileName}
   * @param offset byte offset to start writing at
   * @returns the number of bytes written per row
   */
  static async write(filename: string, offset: number, rows: LogRow[]): Promise<number[]> {
    // Only the first write may create the file. Creating it at a non-zero offset
    // would leave a hole if the log had already been transferred away.
    const create = offset === 0 ? fs.constants.O_CREAT : 0;
    const fd = await dbfs.open(filename, fs.constants.O_WRONLY | create);

    // A file shorter than the offset means content was lost; refuse instead of
    // writing past the hole.
    const size = await fd.size();
    if (size < offset) {
      throw new Error(`size of ${filename} is less than offset`);
    }

    await fd.seek(offset, 'SeekStart');

    // Encode the whole batch before touching the file. The dbfs layer round trips
    // to the database per block written, so one write per row holds the write lock
    // for the entire burst; upstream gets the same effect from a 64KB bufio.Writer.
    const lines: Buffer[] = [];
    const written: number[] = [];
    for (const row of rows) {
      const line = Buffer.from(
        `${this.format(timestampDate(row.time || timestampFromDate(new Date())), row.content)}\n`,
      );
      lines.push(line);
      written.push(line.length);
    }

    await fd.write(Buffer.concat(lines));

    return written;
  }

  /**
   * Move a task's log from DBFS to the archive, the point at which no more rows
   * will be appended.
   *
   * @param filename path returned by {@link logFileName}
   * @returns cleanup that drops the DBFS copy; the caller runs it only after the
   *   row marking the log as archived is durable, so a crash in between still
   *   leaves the log readable.
   */
  static async transfer(filename: string): Promise<() => Promise<void>> {
    const fd = await dbfs.open(filename, fs.constants.O_RDONLY);

    await storage.save(filename, await this.readBlocks(fd, 0, await fd.size()));

    return () => dbfs.remove(filename);
  }

  /**
   * Read rows from a task's log file.
   *
   * @param filename path returned by {@link logFileName}
   * @param offset byte offset to start reading at
   * @param limit maximum number of bytes to read
   * @param inStorage read the archived copy instead of the DBFS one
   * @returns the parsed rows and the byte offset to resume from
   */
  static async read(
    filename: string,
    offset: number,
    limit: number,
    inStorage = false,
  ): Promise<{ rows: LogRow[]; nextOffset: number }> {
    if (inStorage) {
      const size = await storage.size(filename);
      if (offset >= size || limit <= 0) {
        return { rows: [], nextOffset: offset };
      }
      return this.parseChunk((await storage.read(filename, offset, Math.min(limit, size - offset))).toString(), offset);
    }

    const fd = await dbfs.open(filename, fs.constants.O_RDONLY);
    const size = await fd.size();

    if (offset >= size || limit <= 0) {
      return { rows: [], nextOffset: offset };
    }

    return this.parseChunk((await this.readBlocks(fd, offset, Math.min(limit, size - offset))).toString(), offset);
  }

  /** Parse a chunk read starting at `offset` into rows plus the resume offset. */
  static parseChunk(text: string, offset: number): { rows: LogRow[]; nextOffset: number } {
    const lines = text.split('\n');

    // A trailing fragment without a newline is a partially written line: leave it
    // for the next read rather than returning a truncated row.
    const tail = lines.pop() ?? '';
    const consumed = Buffer.byteLength(text, 'utf8') - Buffer.byteLength(tail, 'utf8');

    const rows: LogRow[] = [];
    for (const line of lines) {
      const parsed = this.parse(line);
      if (parsed) {
        rows.push(parsed);
      }
    }

    return { rows, nextOffset: offset + consumed };
  }

  /**
   * Read `length` bytes at `offset`.
   *
   * A single DbFile.read only crosses one block, so keep reading until the range
   * is covered or EOF is hit.
   */
  static async readBlocks(fd: DbFile, offset: number, length: number): Promise<Buffer> {
    await fd.seek(offset, 'SeekStart');

    const chunks: Buffer[] = [];
    let remaining = length;
    while (remaining > 0) {
      const buffer = Buffer.alloc(Math.min(remaining, fd.blockSize));
      // oxlint-disable-next-line no-await-in-loop
      const n = await fd.read(buffer);
      if (n <= 0) {
        break;
      }
      chunks.push(buffer.subarray(0, n));
      remaining -= n;
    }

    return Buffer.concat(chunks);
  }

  /** Parse a stored line of the form `<timestamp> <content>` back into a row. */
  static parse(line: string): LogRow | undefined {
    if (line === '') {
      return undefined;
    }

    const separator = line.indexOf(' ');
    const time = separator === -1 ? '' : line.slice(0, separator);
    const content = separator === -1 ? line : line.slice(separator + 1);

    const date = new Date(time);
    return {
      time: Number.isNaN(date.getTime()) ? undefined : timestampFromDate(date),
      content: content.replaceAll('\\n', '\n'),
    } as LogRow;
  }

  static format(timestamp: Date, content: string) {
    let log = content.split('\n').join('\\n');
    if (log.length > MaxLineSize) {
      log = log.substring(0, MaxLineSize);
    }

    return `${formatTimestamp(timestamp)} ${log}`;
  }
}

export default Log;
