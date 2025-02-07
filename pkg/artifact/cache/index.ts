/**
 * artifact cache server
 * Spin up a local Github artifact cache server to be used with act Github actions that uses actions/cache
 *
 * @see https://github.com/sp-ricard-valverde/github-act-cache-server
 * @see https://github.com/JEFuller/artifact-server/blob/main/index.js
 * @see https://github.com/actions/toolkit/blob/main/packages/cache/src/internal/cacheHttpClient.ts
 *
 * @envs
 *
 * ACTIONS_CACHE_URL - server url
 * ACTIONS_RUNTIME_TOKEN - token
 * GITHUB_REF - scope
 *
 * @auth
 * const Authorization = req.get('Authorization');
 *
 * sobird<i@sobird.me> at 2024/04/30 1:58:31 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sqlite3, { Database } from 'better-sqlite3';
import bodyParser from 'body-parser';
import express, { Handler } from 'express';
import ip from 'ip';
import log4js, { Logger } from 'log4js';

import {
  CacheEntry, ArtifactCacheEntry, ReserveCacheRequest, ReserveCacheResponse, CommitCacheRequest,
} from './contracts';
import Storage from './storage';
import type { AddressInfo } from 'net';

const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.cache', 'actions');

class ArtifactCache {
  storage: Storage;

  db: Database;

  constructor(
    public dir: string = DEFAULT_CACHE_DIR,
    public outboundIP: string = ip.address() || 'localhost',
    public port: number = 0,
    public logger: Logger = log4js.getLogger('ArtifactCache'),
    public app = express(),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.storage = new Storage(path.join(dir, 'cache'));
    this.db = sqlite3(path.join(dir, 'cache.db'), {
      verbose: console.log,
    });

    try {
      this.db.prepare(`CREATE TABLE caches (
        id INTEGER PRIMARY KEY, 
        key TEXT NOT NULL, 
        version TEXT NOT NULL, 
        size INTEGER DEFAULT (0), 
        complete INTEGER DEFAULT (0) NOT NULL, 
        updatedAt INTEGER DEFAULT (0) NOT NULL, 
        createdAt INTEGER DEFAULT (0) NOT NULL
      )`).run();
      this.db.prepare('CREATE INDEX idx_key ON caches (key)');
      this.db.prepare('CREATE UNIQUE INDEX idx_key ON caches (key, version)');
    } catch (err) {
      this.logger.debug((err as Error).message);
    }

    app.set('query parser', 'simple');
    app.use(bodyParser.json());
    app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit: '500mb',
    }));
    app.use(this.middleware);
    app.get('/', (req, res) => {
      res.send({
        status: 'success',
      });
    });

    // Find a cache by keys and version
    app.get('/_apis/artifactcache/cache', this.findCache);
    // Reserve a cache for an upcoming upload
    app.post('/_apis/artifactcache/caches', this.reserveCache);
    // Upload cache file parts with a cache id
    app.patch('/_apis/artifactcache/caches/:cacheId', this.uploadCache);
    // Commit the cache parts upload
    app.post('/_apis/artifactcache/caches/:cacheId', this.commitCache);
    // Download artifact with a given id from the cache
    app.get('/_apis/artifactcache/artifacts/:cacheId', async (req, res) => {
      const { cacheId } = req.params;
      this.db.prepare('UPDATE caches SET updatedAt = ? WHERE id = ?').run(Date.now(), cacheId);

      this.storage.serve(res, Number(cacheId));
    });
    // Purge cache storage and DB
    app.post('/_apis/artifactcache/clean', (req, res) => {
      const { changes } = this.purge(false);
      res.status(200).json({
        count: changes,
      });
    });
  }

  // GET /_apis/artifactcache/cache?key=key1,key2&version=1.0.0
  findCache: Handler = (req, res) => {
    const { keys = '', version = '' } = req.query as { keys: string, version: string };
    const [primaryKey, ...restorePaths] = decodeURIComponent(keys).split(',');
    const idAndKey = this.findCacheEntry(primaryKey, version, restorePaths);

    if (!idAndKey) {
      this.logger.debug(`Missing key ${primaryKey}`);
      res.status(204).json({});
      return;
    }

    const cacheId = idAndKey.id;
    const foundPrimaryKey = idAndKey.key;

    const cacheFile = this.storage.filename(cacheId);
    if (!this.storage.exist(cacheId)) {
      this.logger.debug(`Missing cache file ${cacheFile}`);
      res.status(204).json({});
    } else {
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const cacheFileURL = `${baseURL}/_apis/artifactcache/artifacts/${cacheId}`;
      res.status(200).json({ result: 'hit', archiveLocation: cacheFileURL, cacheKey: foundPrimaryKey } as ArtifactCacheEntry);
    }
  };

  reserveCache: Handler = (req, res) => {
    const { key, version, cacheSize = 0 } = req.body as ReserveCacheRequest;
    const { db } = this;

    this.logger.debug(`Request to reserve cache ${key} for uploading`);
    const row = db.prepare<unknown[], CacheEntry>('SELECT * FROM caches WHERE key = ? AND version = ?').get(key, version);
    if (!row) {
      const id = db.prepare<unknown[], CacheEntry>('INSERT INTO caches (key, version, size, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?)')
        .run(key, version, cacheSize, Date.now(), Date.now()).lastInsertRowid;
      res.status(200).json({ cacheId: id });
      return;
    }

    console.log('row', row);

    if (row.complete) {
      const error = `Cache id ${row.id} was already uploaded`;
      res.status(400).json({ error });
    } else {
      this.logger.debug(`Cache id ${row.id} already reserved, but did not start uploading`);
      res.status(200).json({ cacheId: row.id } as ReserveCacheResponse);
    }
  };

  uploadCache: Handler = async (req, res) => {
    const { cacheId } = req.params;
    const { db } = this;

    const row = db.prepare<unknown[], CacheEntry>('SELECT * FROM caches WHERE id = ?').get(cacheId);
    if (!row) {
      const error = `Cache with id ${cacheId} has not been reserved`;
      res.status(400).json({ error });
      return;
    }

    if (row.complete) {
      const error = `Upload cache with ${row.id} has already been committed and completed`;
      res.status(400).json({ error });
    } else {
      // the format like "bytes 0-22275422/*" only
      const contentRange = req.header('Content-Range') || '';
      const startRange = Number(contentRange.split('-')[0].split(' ')[1]?.trim()) || 0;

      try {
        await this.storage.write(row.id, startRange, req);
        res.status(200).json({});
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
        this.logger.error((err as Error).message);
      }
    }
  };

  commitCache: Handler = async (req, res) => {
    const { cacheId } = req.params;
    const { size } = req.body as CommitCacheRequest;
    const { db } = this;

    const row = db.prepare<unknown[], CacheEntry>('SELECT * FROM caches WHERE id = ?').get(cacheId);

    if (!row) {
      const error = `Cache with id ${cacheId} has not been reserved`;
      this.logger.debug(error);
      res.status(400).json({ error });
      return;
    }

    if (row.complete) {
      const error = `Upload cache with ${row.id} has already been committed and completed`;
      this.logger.debug(error);
      res.status(400).json({ error });
    } else {
      try {
        await this.storage.commit(Number(cacheId), size);

        db.prepare('UPDATE caches SET complete = 1 WHERE id = ?').run(row.id);
        res.status(200).json({});
      } catch (error) {
        this.logger.error((error as Error).message);
        res.status(400).json({ error: (error as Error).message });
      }
    }
  };

  private middleware: Handler = (req, res, next) => {
    // const Authorization = req.get('Authorization');
    // if (req.get('Authorization') !== `Bearer ${process.env.AUTH_KEY}`) {
    //   res.status(401).json({ message: 'You are not authorized' });
    // }
    this.logger.debug(`Request method: ${req.method}, Request url: ${req.originalUrl}`);
    next();
  };

  purge(onlyUncompleted = true) {
    const { db } = this;
    let selectQ;
    let deleteQ;
    if (onlyUncompleted === true) {
      selectQ = 'SELECT * from caches WHERE complete = 0';
      deleteQ = 'DELETE FROM caches WHERE complete = 0';
    } else {
      selectQ = 'SELECT * from caches';
      deleteQ = 'DELETE FROM caches';
    }
    const rows = db.prepare<unknown[], any>(selectQ).all();
    rows.forEach((row) => {
      // Remove cached artifacts if any and temporary uploads
      this.storage.remove(row.id);
    });
    return db.prepare(deleteQ).run();
  }

  // Check if matching cache file exists
  //
  // -- input --
  // keys: list of strings consisting of a primaryKey string and optional restorePath strings prefixes(comma-separated)
  // version: hashed string of the paths the cache contains and the compression cache method
  //
  // -- output --
  // archiveLocation: URL of the archived cache for downloading
  // cacheKey: exact cache key string used, this usually will be primaryKey but if it's not matched and restorePath
  // prefix strings are provided, it could be the full primaryKey for one of the restorePaths
  //
  // -- logic --
  //  1 - look for an exact match on `primaryKey`
  //      1.1 - HIT
  //          1.1.1 - compare if `version` matches in the DB entry
  //              1.1.1.1 - HIT
  //                  1.1.1.1.1 - return a CACHE HIT 200 code. archivePath: as file cache download URL, cacheKey: as current `primaryKey`
  //              1.1.1.2 - MISS
  //                  1.1.1.2.1 - go to `1.2`
  //      1.2 - MISS
  //          1.2.1 - If there are `restorePaths` prefixes remaining
  //              1.2.1.1 - pick the next `restorePath` prefix
  //                  1.2.1.1.1 - look for a primary key in the DB that matches the prefix
  //                      1.2.1.1.1.1 - HIT
  //                          1.2.1.1.1.1.1 - set matched primary key as `primaryKey` and got to `1`
  //                      1.2.1.1.1.2 - MISS
  //                          1.2.1.1.1.2.1 - go to `1.2`
  //          1.2.2 - If there aren't `restorePaths` prefixes remaining
  //              1.2.2.1 - return a CACHE MISS 204 code
  //
  findCacheEntry(
    primaryKey: string,
    version: string,
    restorePaths: string[] = [],
    exactMatch = true,
  ): { id: number, key: string } | undefined {
    let row;
    const { db } = this;

    if (exactMatch) {
      row = db.prepare<unknown[], CacheEntry>('SELECT * FROM caches WHERE key = ? AND version = ?').get(primaryKey, version);
    } else {
      row = db.prepare<unknown[], CacheEntry>(`SELECT * FROM caches WHERE key LIKE '${primaryKey}%' AND version = '${version}' ORDER BY id DESC`).get();
    }

    if (row) {
      return { id: row.id, key: primaryKey };
    }

    if (restorePaths.length > 0) {
      const [newPrimaryKey, ...newRestoreKeys] = restorePaths;
      return this.findCacheEntry(newPrimaryKey, version, newRestoreKeys, false);
    }
  }

  async serve(): Promise<string> {
    return new Promise((resolve) => {
      const server = this.app.listen(this.port, this.outboundIP, () => {
        // this.logger.info('Server running at:', (server.address() as AddressInfo).port);
        const { address, port } = server.address() as AddressInfo;
        resolve(`http://${address}:${port}/`);
      });
    });
  }
}

export default ArtifactCache;
