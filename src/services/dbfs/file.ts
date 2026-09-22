// oxlint-disable no-await-in-loop
import fs from 'node:fs';
import path from 'node:path';

import { DbfsData, DbfsMeta, sequelize } from '@/models';
import { trimSuffix } from '@/utils';

export const DEFAULT_FILE_BLOCK_SIZE: number = 32 * 1024; // 32KB

class DbFile {
  public metaId: number = 0;

  public blockSize: number = DEFAULT_FILE_BLOCK_SIZE;

  public allowRead: boolean = false;

  public allowWrite: boolean = false;

  public offset: number = 0;

  constructor(public fullPath: string) {}

  static async create(p: string) {
    const df = new DbFile(this.buildPath(p));
    await df.loadMetaByPath();
    return df;
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
          if (this.metaId !== 0) {
            throw new Error('EEXIST: file already exists');
          }
        } else {
          // Create a new file if none exists
          await this.createEmpty();
        }
      }

      if (this.metaId === 0) {
        throw new Error('ENOENT: no such file or directory');
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

  async readAt(fileMeta: DbfsMeta, offset: number, buffer: Buffer) {
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
    const canCopy = Math.max(blobData.length - blobPos, 0);
    const realRead = Math.min(needRead, canCopy);

    if (realRead > 0) {
      blobData.copy(buffer, 0, blobPos, blobPos + realRead);
    }

    if (realRead < needRead) {
      buffer.fill(0, realRead, needRead);
    }

    return needRead;
  }

  async read(buffer: Buffer) {
    if (!this.allowRead) {
      throw new Error('Invalid argument: File not opened for reading');
    }

    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    const readBytes = await this.readAt(fileMeta, this.offset, buffer);

    this.offset += readBytes;

    return readBytes;
  }

  async write(buffer: Buffer) {
    if (!this.allowWrite) {
      throw new Error('Invalid argument: File not opened for writing');
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
      const readBytes = await this.readAt(fileMeta, blobOffset, buf);
      buffer.copy(buf, blobPos, 0, needWrite);

      if (blobPos + needWrite > readBytes) {
        buf = buf.subarray(0, blobPos + needWrite);
      } else {
        buf = buf.subarray(0, readBytes);
      }

      await sequelize.transaction(async (t) => {
        // 1. 在事务中先查询该 Block 是否存在，并施加行级排他锁 (FOR UPDATE)
        const existingData = await DbfsData.findOne({
          where: {
            metaId: fileMeta.id,
            blobOffset,
          },
          lock: t.LOCK.UPDATE, // 🔑 排他锁：高并发下防止多个请求同时创建
          transaction: t,
        });

        if (existingData) {
          // 2. 记录已存在：更新数据块并递增 revision
          await existingData.update(
            {
              revision: sequelize.literal('revision + 1'),
              blobData: buf,
            },
            { transaction: t },
          );
        } else {
          // 3. 记录不存在：首次创建数据块（初始 revision 显式设为 1）
          await DbfsData.create(
            {
              metaId: fileMeta.id,
              blobOffset,
              blobData: buf,
              revision: 1, // 显式设定初始版本号
            },
            { transaction: t },
          );
        }
      });

      written += needWrite;
      this.offset += needWrite;

      if (this.offset > (fileMeta?.fileSize || 0)) {
        fileMeta!.fileSize = this.offset;
        needUpdateSize = true;
      }
      buffer = buffer.subarray(needWrite);
    }

    if (needUpdateSize) {
      await DbfsMeta.update(
        { fileSize: this.offset },
        {
          where: {
            id: fileMeta.id,
          },
        },
      );
    }

    return written;
  }

  async seek(offset: number, whence: 'SeekStart' | 'SeekCurrent' | 'SeekEnd') {
    if (this.metaId === 0) {
      throw new Error('Invalid file handle');
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

    if (newOffset < 0) {
      throw new Error('Invalid argument: negative seek offset');
    }

    this.offset = newOffset;
    return newOffset;
  }

  async createEmpty() {
    if (this.metaId !== 0) {
      throw new Error('File already exists');
    }

    await DbfsMeta.create({
      fullPath: this.fullPath,
      blockSize: this.blockSize,
    });

    await this.loadMetaByPath();
  }

  async truncate() {
    if (this.metaId === 0) {
      throw new Error('File does not exist');
    }

    return sequelize.transaction(async () => {
      await DbfsMeta.update({ fileSize: 0 }, { where: { id: this.metaId } });
      await DbfsData.destroy({ where: { metaId: this.metaId } });
    });
  }

  async rename(newPath: string) {
    if (this.metaId === 0) {
      throw new Error('File does not exist');
    }

    return DbfsMeta.update(
      {
        fullPath: DbFile.buildPath(newPath),
      },
      {
        where: {
          id: this.metaId,
        },
      },
    );
  }

  async delete() {
    if (this.metaId === 0) {
      throw new Error('File does not exist');
    }
    return sequelize.transaction(async () => {
      await DbfsMeta.destroy({ where: { id: this.metaId } });
      await DbfsData.destroy({ where: { metaId: this.metaId } });
    });
  }

  async size() {
    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    return fileMeta.fileSize;
  }

  async stat() {
    const fileMeta = await DbFile.findFileMetaById(this.metaId);
    return {
      blksize: fileMeta.blockSize,
      size: fileMeta.fileSize,
      ctime: fileMeta.createdAt,
      mtime: fileMeta.updatedAt,
    };
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
    const fileMeta = await DbfsMeta.findOne({ where: { id: metaId } });
    if (fileMeta) {
      return fileMeta;
    }
    throw new Error('File does not exist');
  }

  static buildPath(p: string) {
    let cleanedPath = path.normalize(p);
    cleanedPath = cleanedPath.replace(/\\/g, '/');
    cleanedPath = trimSuffix(cleanedPath, '/');
    const count = (cleanedPath.match(/\//g) || []).length;
    return `${count}:${cleanedPath}`;
  }
}

export default DbFile;
