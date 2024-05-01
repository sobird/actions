/**
 * artifact cache server
 * Spin up a local Github artifact cache server to be used with act Github actions that uses actions/cache
 *
 * @see https://github.com/sp-ricard-valverde/github-act-cache-server
 * @see https://github.com/JEFuller/artifact-server/blob/main/index.js
 * @see https://github.com/actions/toolkit/blob/main/packages/cache/src/internal/cacheHttpClient.ts
 *
 * @env
 *
 * ACTIONS_CACHE_URL - server url
 * ACTIONS_RUNTIME_TOKEN - token
 * GITHUB_REF - scope
 *
 * sobird<i@sobird.me> at 2024/04/30 1:58:31 created.
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import sqlite3, { SqliteError, Database } from 'better-sqlite3';
import bodyParser from 'body-parser';
import express, { Express, Handler } from 'express';
import ip from 'ip';
import log4js, { Logger } from 'log4js';

import type { AddressInfo } from 'net';

interface CacheEntry {
  id: number;
  key: string;
  version: string;
  size: number;
  complete: boolean;
  started: boolean;
  updatedAt: number;
  createdAt: number;
}

const CACHE_DIR = path.join(os.homedir(), '.cache', 'actcache');
const PART_PREFIX = path.join(CACHE_DIR, '/tmp/.cache_');
const PART_EXT = '.part';
const PART_META_EXT = '.meta';

class ArtifactsCacheServer {
  constructor(
    public dir: string = CACHE_DIR,
    public outboundIP: string = ip.address(),
    public port: number = 0,
    public logger: Logger = log4js.getLogger(),
    private db: Database = sqlite3(path.join(CACHE_DIR, 'cache.db'), {
      verbose: console.log,
    }),
    public app: Express = express(),
  ) {
    this.logger.level = 'debug';

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.setupDatabase(db);

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
    app.get('/_apis/artifactcache/artifacts/:cacheId', (req, res) => {
      const { cacheId } = req.params;
      const cacheFile = path.join(CACHE_DIR, `${cacheId}`);
      const { size } = fs.statSync(cacheFile);
      res.setHeader('Content-Length', size);
      console.log(`File size: ${size}`);

      fs.createReadStream(cacheFile).pipe(res);
    });
    // Purge cache storage and DB
    app.post('/_apis/artifactcache/clean', (req, res) => {
      this.purge(false);
      res.status(200).json({});
    });

    const server = app.listen(port, () => {
      console.log('服务已经启动, 端口监听为:', (server.address() as AddressInfo).port);
    });
  }

  // GET /_apis/artifactcache/cache?key=key1,key2&version=1.0.0
  findCache: Handler = (req, res) => {
    const { keys = '', version = '' } = req.query as { keys: string, version: string };
    const [primaryKey, ...restorePaths] = keys.split(',');

    const idAndKey = this.findCacheEntry(primaryKey, version, restorePaths);
    if (!idAndKey) {
      this.logger.debug(`Missing key ${primaryKey}`);
      res.status(204).json({});
      return;
    }

    const cacheId = idAndKey.id;
    const foundPrimaryKey = idAndKey.key;
    console.log(`Found key ${foundPrimaryKey} with id ${cacheId}`);

    const cacheFile = path.join(CACHE_DIR, `${cacheId}`);
    if (!fs.existsSync(cacheFile)) {
      console.log(`Missing cache file ${cacheFile}`);
      res.status(204).json({});
    } else {
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const cacheFileURL = `${baseURL}/_apis/artifactcache/artifacts/${cacheId}`;
      res.status(200).json({ result: 'hit', archiveLocation: cacheFileURL, cacheKey: foundPrimaryKey });
    }
  };

  reserveCache: Handler = (req, res) => {
    const { key, version } = req.body;
    const { db } = this;

    console.log(`Request to reserve cache ${key} for uploading`);
    const row = db.prepare<unknown[], Cache>('SELECT * FROM caches WHERE key = ? AND version = ?').get(key, version);
    if (row !== undefined) {
      if (row.complete) {
        const err = `Cache id ${row.id} was already uploaded`;
        console.error(err);
        res.status(400).json({ error: err });
      } else if (row.started) {
        const err = `Cache id ${row.id} is already reserved and uploading`;
        console.error(err);
        res.status(400).json({ error: err });
      } else {
        console.log(`Cache id ${row.id} already reserved, but did not start uploading`);
        res.status(200).json({ cacheId: row.id });
      }
    } else {
      const id = db.prepare('INSERT INTO caches (key, version) VALUES (?, ?)').run(key, version).lastInsertRowid;
      res.status(200).json({ cacheId: id });
    }
  };

  uploadCache: Handler = (req, res) => {
    console.log('Upload request');
    const { cacheId } = req.params;
    const { db } = this;

    const row = db.prepare<unknown[], Cache>('SELECT * FROM caches WHERE id = ?').get(cacheId);
    if (row === undefined) {
      const err = `Cache with id ${cacheId} has not been reserved`;
      console.error(err);
      res.status(400).json({ error: err });
    } else if (row.complete) {
      const err = `Upload cache with ${row.id} has already been committed and completed`;
      console.error(err);
      res.status(400).json({ error: err });
    } else {
      if (!row.started) {
        console.log(`Upload for cache id ${row.id} started`);
        db.prepare('UPDATE caches SET started = 1 WHERE id = ?').run(row.id);
      }

      const contentRange = req.header('Content-Range');
      console.log('contentRange', contentRange);
      writePartFile(row.id, req.body, contentRange);
      res.status(200).json({});
    }
  };

  commitCache: Handler = (req, res) => {
    console.log('Commit cache request');
    const { cacheId } = req.params;
    const { db } = this;

    const row = db.prepare<unknown[], Cache>('SELECT * FROM caches WHERE id = ?').get(cacheId);
    if (row === undefined) {
      const err = `Cache with id ${cacheId} has not been reserved`;
      console.error(err);
      res.status(400).json({ error: err });
    } else if (row.complete) {
      const err = `Upload cache with ${row.id} has already been committed and completed`;
      console.error(err);
      res.status(400).json({ error: err });
    } else if (!row.started) {
      const err = `Upload for cache id ${row.id} has been reserved but never started uploading`;
      console.error(err);
      res.status(400).json({ error: err });
    } else {
      const { size } = req.body;
      const partFiles = getOrderedPartFiles(cacheId);
      if (partFiles === null || partFiles.length === 0) {
        const err = `No uploaded parts to commit for id ${cacheId}`;
        console.error(err);
        res.status(400).json({ error: err });
      } else {
        const cacheFile = path.join(CACHE_DIR, `${cacheId}`);
        mergeFiles(partFiles, cacheFile).then((status) => {
          const cacheFileSize = fs.statSync(cacheFile).size;
          if (cacheFileSize !== size) {
            const err = `Uploaded size mismatch: received ${cacheFileSize} expected ${size}`;
            console.error(err);
            res.status(400).json({ error: err });
          } else {
            res.status(200).json({});
            db.prepare('UPDATE caches SET complete = 1 WHERE id = ?').run(row.id);
          }
          const tmpPartPaths = `${PART_PREFIX}${cacheId}`;
          fs.rmSync(tmpPartPaths, { recursive: true, force: true });
        });
      }
    }
  };

  private middleware: Handler = (req, res, next) => {
    console.log('req', req.baseUrl);
    this.logger.debug(`Request method: ${req.method}, Request url: ${req.originalUrl}`);
    this.logger.debug(`Request body: ${JSON.stringify(req.body)}`, `Request query ${JSON.stringify(req.query)}`);
    next();
    this.gcCache();
  };

  gcCache() {
    //
    console.log('gcCache');
  }

  setupDatabase(db: Database) {
    try {
      db.prepare(''
        + 'CREATE TABLE caches ('
        + 'id INTEGER PRIMARY KEY, '
        + 'key TEXT NOT NULL, '
        + 'version TEXT NOT NULL, '
        + 'started INTEGER DEFAULT (0) NOT NULL, '
        + 'complete INTEGER DEFAULT (0) NOT NULL)').run();
      db.prepare('CREATE INDEX idx_key ON caches (key)');
      db.prepare('CREATE UNIQUE INDEX idx_key ON caches (key, version)');
    } catch (err) {
      this.logger.info((err as typeof SqliteError.prototype).message);
    }
  }

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
      // Remove temporary uploads
      const tmpPartPaths = `${PART_PREFIX}${row.id}`;
      console.log(`Removing ${tmpPartPaths}`);
      fs.rmSync(tmpPartPaths, { recursive: true, force: true });
      // Remove cached artifacts if any
      const cacheFile = path.join(CACHE_DIR, row.id.toString());
      console.log(`Removing ${cacheFile}`);
      fs.rmSync(cacheFile, { recursive: true, force: true });
    });
    console.log('Purging DB');
    db.prepare(deleteQ).run();
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
}

function getPartFile(cacheId: number, contentRange: string) {
  const tmpPartPaths = `${PART_PREFIX}${cacheId}`;
  if (!fs.existsSync(tmpPartPaths)) {
    fs.mkdirSync(tmpPartPaths, { recursive: true });
  }
  const fileName = crypto.createHash('sha256').update(contentRange).digest('hex');
  return path.join(tmpPartPaths, `${fileName}${PART_EXT}`);
}

function writePartFile(id: number, body: NodeJS.ArrayBufferView, contentRange: string) {
  const file = getPartFile(id, contentRange);
  // .meta file contains the contentRange value and will be used to order and merge .part files
  const metaFile = file + PART_META_EXT;
  console.log(`Writing range ${contentRange} to ${metaFile}`);
  fs.writeFileSync(`${path.normalize(metaFile)}`, contentRange, { encoding: 'utf-8' });
  console.log(`Write file part to ${file}`, body);
  try {
    fs.writeFileSync(`${path.normalize(file)}`, body);
  } catch (err) {
    console.log('err', err);
  }
}

function getOrderedPartFiles(cacheId) {
  const tmpPartPaths = `${PART_PREFIX}${cacheId}`;
  if (!fs.existsSync(tmpPartPaths)) {
    return null;
  }
  const res = [];
  const metaPartFiles = fs.readdirSync(tmpPartPaths).filter((file) => {
    return file.indexOf(PART_META_EXT) !== -1;
  });
  const rangeMap = {};
  metaPartFiles.forEach((metaPartFile) => {
    const metaPartFilePath = path.join(tmpPartPaths, metaPartFile);
    const content = fs.readFileSync(metaPartFilePath, { encoding: 'utf-8' });
    // Range string is of the form "bytes 67108864-100663295/*"
    const startRange = Number(content.split('-')[0].split(' ')[1].trim());
    rangeMap[startRange] = path.join(tmpPartPaths, path.parse(metaPartFilePath).name);
  });
  Object.keys(rangeMap).sort((a, b) => { return Number(a) - Number(b); }).map((k) => { res.push(rangeMap[k]); });
  for (let i = 0; i < res.length; i++) {
    const partFilePath = res[i];
    console.log(`Part ${i + 1}/${res.length} is file ${partFilePath}`);
    if (!fs.existsSync(partFilePath)) {
      console.error(`File ${partFilePath} does not exist`);
      return null;
    }
  }
  return res;
}

export default ArtifactsCacheServer;

const cache = new ArtifactsCacheServer(undefined, undefined, 3000);
