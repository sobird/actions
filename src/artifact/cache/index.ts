// oxlint-disable oxc/no-async-endpoint-handlers
/**
 * GitHub Artifact Cache Server
 *
 * Spin up a local Github artifact cache server to be used with Github actions that uses actions/cache
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
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';

import bodyParser from 'body-parser';
import express, { Request, Router } from 'express';
import rateLimit from 'express-rate-limit';
import ip from 'ip';
import log4js, { Logger } from 'log4js';
import sqlite3, { Database } from 'sqlite3';

import { ReserveStatus, ReserveCacheRequest } from './contracts';
import { ArtifactCacheService } from './service.ts';
import { Storage } from './storage';

const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.cache', 'actions');

class ArtifactCache {
  db: Database;
  storage: Storage;
  service: ArtifactCacheService;

  constructor(
    public dir: string = DEFAULT_CACHE_DIR,
    public app = express(),
    public logger: Logger = log4js.getLogger('[artifact cache]'),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.storage = new Storage(path.join(dir, 'artifact'));
    this.db = new sqlite3.Database(path.join(dir, 'artifact.db'), (err) => {
      if (err) {
        this.logger.error('Failed to open database:', err.message);
      } else {
        this.database();
      }
    });
    this.service = new ArtifactCacheService(this.db, this.storage, this.logger);

    app.set('query parser', 'simple');
    // app.use(bodyParser.json());
    // app.use(bodyParser.raw({
    //   type: 'application/octet-stream',
    //   limit: '500mb',
    // }));
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );

    app.get('/', (req, res) => {
      res.send({
        status: 'success',
      });
    });

    const router = Router();
    /**
     * Find a cache by keys and version
     *
     * GET /_apis/artifactcache/cache?key=key1,key2&version=1.0.0
     */
    router.get('/cache', async (req: Request<{}, {}, {}, { keys: string; version: string }>, res) => {
      const { keys = '', version = '' } = req.query;

      try {
        const result = await this.service.findCache(keys, version);
        if (!result) {
          return res.status(204).end();
        }
        const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
        const cacheFileURL = `${baseURL}/_apis/artifactcache/artifacts/${result.id}`;
        res.status(200).json({ result: 'hit', archiveLocation: cacheFileURL, cacheKey: result.key });
      } catch (error) {
        this.logger.error('Reserve failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // Reserve a cache for an upcoming upload
    router.post('/caches', bodyParser.json(), async (req: Request<{}, {}, ReserveCacheRequest>, res) => {
      const { key, version, cacheSize = 0 } = req.body;

      try {
        const result = await this.service.reserveCache(key, version, cacheSize);

        switch (result.status) {
          case ReserveStatus.Created:
            return res.status(200).json({ cacheId: result.cacheId });

          case ReserveStatus.Exists:
            return res.status(200).json({ cacheId: result.cacheId });

          case ReserveStatus.Completed:
            // 已经上传过的资源不准重新预约，返回 400 Bad Request
            return res.status(400).json({
              error: result.error,
            });
        }
      } catch (error) {
        this.logger.error('Reserve failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // Upload cache file parts with a cache id
    router.patch('/caches/:cacheId', async (req, res) => {
      const { cacheId } = req.params;
      const contentRange = req.header('Content-Range') || '';
      const startRange = Number(contentRange.split('-')[0].split(' ')[1]?.trim()) || 0;

      try {
        const result = await this.service.uploadCache(cacheId, startRange, req);
        if (result) {
          return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ message: 'Chunk uploaded' });
      } catch (error) {
        this.logger.error('Upload failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // Commit the cache parts upload
    router.post('/caches/:cacheId', bodyParser.json(), async (req, res) => {
      const { cacheId } = req.params;
      const { size } = req.body;

      try {
        await this.service.commitCache(cacheId, size);
        res.status(200).json({});
      } catch (error) {
        this.logger.error('Commit failed:', error);
        console.log('error', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // Download artifact with a given id from the cache
    router.post('/artifacts/:cacheId', bodyParser.json(), async (req, res) => {
      const { cacheId } = req.params;
      try {
        const rs = await this.service.downloadCache(cacheId);
        rs.pipe(res);
      } catch (error) {
        this.logger.error('Download failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // Purge cache storage and DB
    router.post('/clean', async (req, res) => {
      try {
        const count = await this.service.purge(false);
        res.status(200).json({ count });
      } catch (error) {
        this.logger.error('Purge failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.use('/_apis/artifactcache', router);
  }

  private database() {
    this.db.serialize(() => {
      // 创建表和索引
      this.db.run(
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
          if (err) this.logger.debug(err.message);
        },
      );

      this.db.run('CREATE INDEX IF NOT EXISTS idx_key ON caches (key)', (err) => {
        if (err) this.logger.debug(err.message);
      });

      this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_key_version ON caches (key, version)', (err) => {
        if (err) this.logger.debug(err.message);
      });
    });
  }

  async serve(port: number = 0, address: string = ip.address() || 'localhost') {
    return new Promise<string>((resolve) => {
      const server = this.app.listen(port, () => {
        // this.logger.info('Server running at:', (server.address() as AddressInfo).port);
        const addressInfo = server.address() as AddressInfo;
        resolve(`http://${address}:${addressInfo.port}/`);
      });
    });
  }
}

export default ArtifactCache;
