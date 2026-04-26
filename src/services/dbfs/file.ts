import fs from 'node:fs';
import path from 'node:path';

import { sequelize } from '@/models';
import DbfsData from '@/models/dbfs/data';
import DbfsMeta from '@/models/dbfs/meta';
import { trimSuffix } from '@/utils';

const DefaultFileBlockSize: number = 32 * 1024;

// fs.Stats(dev, mode, nlink, uid, gid, rdev, blksize, ino, size, blocks, atimeMs, mtimeMs, ctimeMs, birthtimeMs)

class DbFile {
  public metaId: number = 0;

  public blockSize: number = DefaultFileBlockSize;

  public allowRead: boolean = false;

  public allowWrite: boolean = false;

  public offset: number = 0;

  constructor(public fullPath: string) {

  }

  async open(flags: number) {
    if ((flags & fs.constants.O_WRONLY) !== 0) {
      this.allowWrite = true;
    } else if ((flags & fs.constants.O_RDWR) !== 0) {
      this.allowRead = true;
      this.allowWrite = true;
    } else {
      this.allowRead = true;
    }

    if (this.allowWrite) {
      if (flags & fs.constants.O_CREAT) {
        if (flags & fs.constants.O_EXCL) {
          // File must not exist
          if (this.metaId !== 0) {
            throw new Error('EEXIST: file already exists');
          }
        } else {
          // Create a new file if none exists
          await this.createEmpty();
        }
      }

      if (flags & fs.constants.O_TRUNC) {
        await this.truncate();
      }
      if (flags & fs.constants.O_APPEND) {
        await this.seek(0, 'SeekEnd');
      }

      return;
    }

    // Read-only mode
    if (this.metaId === 0) {
      throw new Error('ENOENT: no such file or directory');
    }
  }

  async readAt(fileMeta: DbfsMeta | null, offset: number, buffer: Buffer) {
    if (!fileMeta) {
      return 0;
    }

    if (offset >= fileMeta.fileSize) {
      return 0;
    }

    const blobPos = offset % this.blockSize;
    const blobOffset = offset - blobPos;
    const blobRemaining = this.blockSize - blobPos;
    let needRead = Math.min(buffer.length, blobRemaining);

    if (blobOffset + blobPos + needRead > fileMeta.fileSize) {
      needRead = fileMeta.fileSize - blobOffset - blobPos;
    }

    if (needRead <= 0) {
      return 0;
    }

    const fileData = await DbfsData.findOne({
      where: {
        metaId: this.metaId,
        blobOffset,
      },
    });

    const blobData = fileData?.blobData || Buffer.alloc(0);
    const canCopy = blobData.length - blobPos;
    let realRead = needRead;
    if (realRead > canCopy) {
      realRead = canCopy;
    }

    if (realRead > 0) {
      buffer.fill(blobData.slice(blobPos, blobPos + realRead), 0, realRead);
    }

    for (let i = realRead; i < needRead; i++) {
      // eslint-disable-next-line no-param-reassign
      // buffer[i] = 0;
    }

    return needRead;
  }

  async read(buffer: Buffer) {
    if (this.metaId === 0 || !this.allowRead) {
      throw new Error('Write permission denied');
    }

    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    const readBytes = await this.readAt(fileMeta, this.offset, buffer);

    console.log('readBytes', readBytes);

    this.offset += readBytes;

    return readBytes;
  }

  async write(buffer: Buffer) {
    if (this.metaId === 0 || !this.allowWrite) {
      throw new Error('Write permission denied');
    }

    const fileMeta = await DbFile.findFileMetaById(this.metaId);

    let needUpdateSize = false;
    let written = 0;
    while (buffer.length > 0) {
      const blobPos = this.offset % this.blockSize;
      const blobOffset = this.offset - blobPos;
      const blobRemaining = this.blockSize - blobPos;
      const needWrite = Math.min(buffer.length, blobRemaining);
      let buf = Buffer.alloc(this.blockSize);

      // const buffer = Buffer.alloc(needRead, 0);
      //   buffer.copy(data.slice(blobPos, blobPos + bytesRead));

      // eslint-disable-next-line no-await-in-loop
      const readBytes = await this.readAt(fileMeta, blobOffset, buf);
      buf.fill(buffer.slice(0, needWrite), blobPos, blobPos + needWrite);
      // buf.slice(blobPos, blobPos + needWrite).set(buffer.slice(0, needWrite));

      if (blobPos + needWrite > readBytes) {
        buf = buf.slice(0, blobPos + needWrite);
      } else {
        buf = buf.slice(0, readBytes);
      }

      const fileData = {
        metaId: fileMeta!.id,
        blobOffset,
        blobData: buf,
      };

      // eslint-disable-next-line no-await-in-loop
      const [affectedCount] = await DbfsData.update({
        revision: sequelize.literal('revision + 1'),
        blobData: buf,
      }, {
        where: {
          metaId: fileMeta?.id,
          blobOffset,
        },
      });
      if (affectedCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await DbfsData.create(fileData);
      }

      written += needWrite;
      this.offset += needWrite;
      if (this.offset > (fileMeta?.fileSize || 0)) {
        fileMeta!.fileSize = this.offset;
        needUpdateSize = true;
      }
      // eslint-disable-next-line no-param-reassign
      buffer = buffer.slice(needWrite);
    }

    if (needUpdateSize) {
      await DbfsMeta.update({ fileSize: this.offset }, {
        where: {
          id: fileMeta?.id,
        },
      });
    }

    return written;
  }

  async seek(offset: number, whence: 'SeekStart' | 'SeekCurrent' | 'SeekEnd') {
    if (this.metaId === 0) {
      return;
    }

    let newOffset = this.offset;
    switch (whence) {
      case 'SeekStart':
        newOffset = offset;
        break;
      case 'SeekCurrent':
        newOffset += offset;
        break;
      case 'SeekEnd': {
        const size = await this.size();
        newOffset = size + offset;
        break;
      }
      default:
        throw new Error('Invalid whence');
    }
    this.offset = newOffset;
    return newOffset;
  }

  async createEmpty() {
    if (this.metaId !== 0) {
      throw new Error('ErrExist');
    }

    await DbfsMeta.create({
      fullPath: this.fullPath,
      blockSize: this.blockSize,
    });

    await this.loadMetaByPath();
  }

  async truncate() {
    if (this.metaId === 0) {
      return;
    }

    return sequelize.transaction(async () => {
      await DbfsMeta.update({ fileSize: 0 }, { where: { id: this.metaId } });
      await DbfsData.destroy({ where: { metaId: this.metaId } });
    });
  }

  async rename(newPath: string) {
    if (this.metaId === 0) {
      return;
    }

    return DbfsMeta.update({
      fullPath: DbFile.buildPath(newPath),
    }, {
      where: {
        id: this.metaId,
      },
    });
  }

  async delete() {
    if (this.metaId === 0) {
      return;
    }
    return sequelize.transaction(async () => {
      await DbfsMeta.destroy({ where: { id: this.metaId } });
      await DbfsData.destroy({ where: { metaId: this.metaId } });
    });
  }

  async size() {
    if (this.metaId === 0) {
      return 0;
    }
    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    return fileMeta?.fileSize || 0;
  }

  async stat() {
    if (this.metaId === 0) {
      throw Error('ErrInvalid');
    }

    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    const stat = new fs.Stats();
    stat.blksize = fileMeta?.blockSize || 0;
    stat.size = fileMeta?.fileSize || 0;
    stat.ctime = fileMeta?.createdAt || new Date();
    stat.mtime = fileMeta?.updatedAt || new Date();
    return stat;
  }

  async loadMetaByPath() {
    const fileMeta = await DbfsMeta.findOne({ where: { fullPath: this.fullPath } });

    if (fileMeta) {
      this.metaId = fileMeta.id;
      this.blockSize = fileMeta.blockSize;
    }

    return fileMeta;
  }

  static async findFileMetaById(metaId: number) {
    return DbfsMeta.findOne({ where: { id: metaId } });
  }

  static buildPath(p: string) {
    let cleanedPath = path.normalize(p);
    cleanedPath = cleanedPath.replace(/\\/g, '/');
    cleanedPath = trimSuffix(cleanedPath, '/');
    const count = (cleanedPath.match(/\//g) || []).length;
    return `${count}:${cleanedPath}`;
  }

  static async New(p: string) {
    const df = new DbFile(this.buildPath(p));
    await df.loadMetaByPath();
    return df;
  }
}

export default DbFile;
