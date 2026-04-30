import type { Readable } from 'node:stream';

import log4js from 'log4js';
import sqlite3, { Database, Statement } from 'sqlite3';

import { ArtifactCacheService } from './service.ts';
import { Storage } from './storage.ts';

const logger = log4js.getLogger('ArtifactCacheService');

let db: Database;
let service: ArtifactCacheService;
let storage: Storage;

beforeEach(() => {
  db = new sqlite3.Database(':memory:');
  db.serialize(() => {
    // 创建表和索引
    db.run(
      `CREATE TABLE IF NOT EXISTS caches (
      id INTEGER PRIMARY KEY, 
      key TEXT NOT NULL, 
      version TEXT NOT NULL, 
      size INTEGER DEFAULT (0), 
      complete INTEGER DEFAULT (0) NOT NULL, 
      updatedAt INTEGER DEFAULT (0) NOT NULL, 
      createdAt INTEGER DEFAULT (0) NOT NULL
    )`,
      (err) => {
        if (err) {
          console.log(err);
        }
      },
    );

    db.run('CREATE INDEX IF NOT EXISTS idx_key ON caches (key)', (err) => {
      if (err) {
        console.log(err);
      }
    });

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_key_version ON caches (key, version)', (err) => {
      if (err) {
        console.log(err);
      }
    });
  });

  storage = new Storage();
  service = new ArtifactCacheService(db, storage, logger);
});

afterEach(() => {
  // Close the database after each test to ensure clean state for the next one
  db.close();
});

describe('findCacheEntry', () => {
  it('should find cache by exact match', async () => {
    // Insert a test cache into the in-memory DB
    await runQuery('INSERT INTO caches (key, version, complete, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?)', [
      'primaryKey',
      'version',
      0,
      Date.now(),
      Date.now(),
    ]);

    const result = await service.findCacheEntry('primaryKey', 'version', []);
    expect(result).toEqual({ id: 1, key: 'primaryKey' });
  });

  it('should return undefined if cache not found', async () => {
    // Mock db.get to return no result
    const result = await service.findCacheEntry('primaryKey', 'version', []);
    expect(result).toBeUndefined();
  });

  it('should handle restore paths and find a match', async () => {
    // Insert two caches for the same key with different versions
    await runQuery('INSERT INTO caches (key, version, complete, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?)', [
      'primaryKeyPrefix',
      'version',
      0,
      Date.now(),
      Date.now(),
    ]);
    await runQuery('INSERT INTO caches (key, version, complete, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?)', [
      'primaryKeyPrefix_restored',
      'version',
      0,
      Date.now(),
      Date.now(),
    ]);

    const result = await service.findCacheEntry('primaryKeyPrefix_restored', 'version', ['primaryKeyPrefix']);
    expect(result).toEqual({ id: 2, key: 'primaryKeyPrefix_restored' });
  });
});

describe('findCache', () => {
  it('should return cache if found', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: false });
      return db;
    });

    vi.spyOn(storage, 'exist').mockImplementationOnce(() => true);

    const result = await service.findCache('primaryKey', 'version');
    expect(result).toEqual({ id: 1, key: 'primaryKey' });
  });

  it('should log missing cache file if not found', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: false });
      return db;
    });

    vi.spyOn(storage, 'exist').mockImplementationOnce(() => false);

    const result = await service.findCache('primaryKey', 'version');
    expect(result).toBeUndefined();
  });
});

describe('reserveCache', () => {
  it('should create a new cache if not found', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, null); // No cache found
      return db;
    });

    // vi.spyOn(db, 'run').mockImplementationOnce(function (query, params, cb) {
    //   cb(null); // Simulate successful insert
    //   return db;
    // });

    const result = await service.reserveCache('primaryKey', 'version');
    expect(result).toEqual({ lastID: 1 });
  });

  it('should return a reserved cache if found', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: false });
      return db;
    });

    const result = await service.reserveCache('primaryKey', 'version');
    expect(result).toBeUndefined();
  });
});

describe('uploadCache', () => {
  it('should handle cache upload', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: false });
      return db;
    });

    vi.spyOn(storage, 'write').mockImplementationOnce(() => Promise.resolve());

    const result = await service.uploadCache('1', 0, {} as Readable);
    expect(result).toBeUndefined();
  });

  it('should return error if cache not found', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, null);
      return db;
    });

    const result = await service.uploadCache('1', 0, {} as Readable);
    expect(result).toEqual({ error: 'Cache with id 1 has not been reserved' });
  });
});

describe('commitCache', () => {
  it('should commit cache and mark it as complete', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: false });
      return db;
    });

    vi.spyOn(storage, 'commit').mockImplementationOnce(() => Promise.resolve(100));

    vi.spyOn(db, 'prepare').mockImplementationOnce((sql, cb) => {
      cb(null);
      return {
        run: vi.fn().mockImplementationOnce(() => {}),
      } as unknown as Statement;
    });
    await service.commitCache('1', 100);

    expect(db.prepare).toHaveBeenCalled();
    expect(storage.commit).toHaveBeenCalledWith(1, 100);
  });

  it('should throw error if cache is already complete', async () => {
    vi.spyOn(db, 'get').mockImplementationOnce((query, params, cb) => {
      cb(null, { id: 1, key: 'primaryKey', version: 'version', complete: true });
      return db;
    });

    await expect(service.commitCache('1', 100)).rejects.toThrow(
      'Upload cache with 1 has already been committed and completed',
    );
  });
});

describe('purge', () => {
  it('should purge caches correctly', async () => {
    vi.spyOn(db, 'all').mockImplementationOnce((query, cb) => {
      cb(null, [{ id: 1 }, { id: 2 }]);
      return db;
    });

    vi.spyOn(storage, 'remove').mockImplementationOnce(() => Promise.resolve());

    vi.spyOn(db, 'run').mockImplementationOnce(function (query, cb) {
      cb.call({ changes: 1 }, null);
      return db;
    });

    await service.purge(true);

    expect(storage.remove).toHaveBeenCalledWith(1);
    expect(storage.remove).toHaveBeenCalledWith(2);
  });
});

function runQuery(query: string, params: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
