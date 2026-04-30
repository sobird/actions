import type { Readable } from 'node:stream';

import type { Logger } from 'log4js';
import type { Database } from 'sqlite3';

import type { CacheEntry } from './contracts';
import type { Storage } from './storage.ts';

export class ArtifactCacheService {
  constructor(
    private db: Database,
    private storage: Storage,
    private logger: Logger,
  ) {}

  /**
   * Check if matching cache file exists
   *
   * -- input --
   * keys: list of strings consisting of a primaryKey string and optional restorePath strings prefixes(comma-separated)
   * version: hashed string of the paths the cache contains and the compression cache method
   *
   * -- output --
   * archiveLocation: URL of the archived cache for downloading
   * cacheKey: exact cache key string used, this usually will be primaryKey but if it's not matched and restorePath
   * prefix strings are provided, it could be the full primaryKey for one of the restorePaths
   *
   * -- logic --
   *  1 - look for an exact match on `primaryKey`
   *      1.1 - HIT
   *          1.1.1 - compare if `version` matches in the DB entry
   *              1.1.1.1 - HIT
   *                  1.1.1.1.1 - return a CACHE HIT 200 code. archivePath: as file cache download URL, cacheKey: as current `primaryKey`
   *              1.1.1.2 - MISS
   *                  1.1.1.2.1 - go to `1.2`
   *      1.2 - MISS
   *          1.2.1 - If there are `restorePaths` prefixes remaining
   *              1.2.1.1 - pick the next `restorePath` prefix
   *                  1.2.1.1.1 - look for a primary key in the DB that matches the prefix
   *                      1.2.1.1.1.1 - HIT
   *                          1.2.1.1.1.1.1 - set matched primary key as `primaryKey` and got to `1`
   *                      1.2.1.1.1.2 - MISS
   *                          1.2.1.1.1.2.1 - go to `1.2`
   *          1.2.2 - If there aren't `restorePaths` prefixes remaining
   *              1.2.2.1 - return a CACHE MISS 204 code
   */
  async findCacheEntry(
    primaryKey: string,
    version: string,
    restorePaths: string[] = [],
    exactMatch = true,
  ): Promise<{ id: number; key: string } | undefined> {
    let query: string;
    let params: any[];

    if (exactMatch) {
      query = 'SELECT * FROM caches WHERE key = ? AND version = ?';
      params = [primaryKey, version];
    } else {
      query = 'SELECT * FROM caches WHERE key LIKE ? AND version = ? ORDER BY id DESC';
      params = [`${primaryKey}%`, version];
    }

    const row = await new Promise<CacheEntry | null>((resolve, reject) => {
      this.db.get<CacheEntry>(query, params, (err, _row) => {
        if (err) {
          reject(err);
        } else {
          resolve(_row);
        }
      });
    });

    if (row) {
      return { id: row.id, key: primaryKey };
    }

    if (restorePaths.length > 0) {
      const [newPrimaryKey, ...newRestoreKeys] = restorePaths;
      return this.findCacheEntry(newPrimaryKey, version, newRestoreKeys, false);
    }
  }

  async findCache(keys: string, version: string) {
    const [primaryKey, ...restorePaths] = decodeURIComponent(keys).split(',');

    const idAndKey = await this.findCacheEntry(primaryKey, version, restorePaths, true);

    if (!idAndKey) {
      this.logger.debug(`Missing key ${primaryKey}`);
      return;
    }

    const cacheId = idAndKey.id;
    const cacheFile = this.storage.getFinalPath(cacheId);
    if (!this.storage.exist(cacheId)) {
      this.logger.debug(`Missing cache file ${cacheFile}`);
    } else {
      return idAndKey;
    }
  }

  async reserveCache(key: string, version: string, cacheSize = 0) {
    this.logger.debug(`Request to reserve cache ${key} for uploading`);

    // 查找是否已存在该缓存
    const row = await new Promise<CacheEntry | null>((resolve, reject) => {
      this.db.get<CacheEntry>('SELECT * FROM caches WHERE key = ? AND version = ?', [key, version], (err, _row) => {
        if (err) {
          reject(err);
        } else {
          resolve(_row);
        }
      });
    });

    if (!row) {
      // 如果缓存不存在，创建新的缓存条目
      return new Promise<{ lastID: number }>((resolve, reject) => {
        this.db.run(
          'INSERT INTO caches (key, version, size, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?)',
          [key, version, cacheSize, Date.now(), Date.now()],
          function (error) {
            if (error) {
              reject(error);
            } else {
              resolve({ lastID: this.lastID });
            }
          },
        );
      });
    } else if (row.complete) {
      // 如果缓存已经完成上传，返回错误
      // res.status(400).json({ error: `Cache id ${row.id} was already uploaded` });
    } else {
      // 如果缓存已经被保留，返回缓存的ID
      this.logger.debug(`Cache id ${row.id} already reserved, but did not start uploading`);
    }
  }

  async uploadCache(cacheId: string, offset: number, stream: Readable) {
    const { db } = this;

    // 查找缓存条目
    const cacheEntry = await new Promise<CacheEntry | null>((resolve, reject) => {
      db.get<CacheEntry>('SELECT * FROM caches WHERE id = ?', [cacheId], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });

    if (!cacheEntry) {
      return { error: `Cache with id ${cacheId} has not been reserved` };
    }

    if (cacheEntry.complete) {
      return { error: `Upload cache with ${cacheEntry.id} has already been committed and completed` };
    }

    // 使用 storage.write 来进行数据写入
    await this.storage.write(cacheEntry.id, offset, stream);
  }

  async commitCache(cacheId: string, size: number) {
    // 查询缓存条目
    const cacheEntry = await new Promise<CacheEntry | null>((resolve, reject) => {
      this.db.get<CacheEntry>('SELECT * FROM caches WHERE id = ?', [cacheId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!cacheEntry) {
      const error = `Cache with id ${cacheId} has not been reserved`;
      this.logger.debug(error);
      throw new Error(error);
    }

    if (cacheEntry.complete) {
      const error = `Upload cache with ${cacheEntry.id} has already been committed and completed`;
      this.logger.debug(error);
      throw new Error(error);
    }

    // 提交缓存
    await this.storage.commit(Number(cacheId), size);

    // 更新缓存为已完成
    await new Promise<void>((resolve, reject) => {
      this.db
        .prepare('UPDATE caches SET complete = 1 WHERE id = ?', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        })
        .run(cacheEntry.id);
    });
  }

  async purge(onlyUncompleted = true) {
    const selectQ = onlyUncompleted ? 'SELECT * from caches WHERE complete = 0' : 'SELECT * from caches';
    const deleteQ = onlyUncompleted ? 'DELETE FROM caches WHERE complete = 0' : 'DELETE FROM caches';

    // 获取所有数据
    const rows = await new Promise<CacheEntry[]>((resolve, reject) => {
      this.db.all<CacheEntry>(selectQ, (err, _rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(_rows);
        }
      });
    });

    rows.forEach((row) => {
      this.storage.remove(row.id);
    });

    // 执行删除操作
    await new Promise((resolve, reject) => {
      this.db.run(deleteQ, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
}
