/**
 * artifact cache server
 * Spin up a local Github artifact cache server to be used with act Github actions that uses actions/cache
 *
 * @see https://github.com/sp-ricard-valverde/github-act-cache-server
 * @see https://github.com/JEFuller/artifact-server/blob/main/index.js
 * sobird<i@sobird.me> at 2024/04/30 1:58:31 created.
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';
import log4js, { Logger } from 'log4js';
import ip from 'ip';
import express, { Handler } from 'express';
import { ClassicLevel } from 'classic-level';

const BASE_URL = '/_apis/artifactcache';

class ArtifactsCacheServer {
  constructor(
    public dir: string = path.join(os.homedir(), '.cache', 'actcache'),
    public outboundIP: string = ip.address(),
    public port: number = 0,
    public logger: Logger = log4js.getLogger(),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const app = express();

    app.use(this.middleware);

    app.get(path.join(BASE_URL, 'cache'), (req, res) => {
      // todo
      console.log('1212', 1212);
      res.json({
        ok: 0,
      });
    });

    const server = app.listen(port, () => {
      console.log('服务已经启动, 端口监听为:', (server.address() as AddressInfo).port);
    });
  }

  // GET /_apis/artifactcache/cache
  find: Handler = (req, res) => {
    //
  };

  private middleware: Handler = (req, res, next) => {
    this.logger.debug(`Request method: ${req.method}, Request url: ${req.originalUrl}`);
    next();
    this.gcCache();
  };

  gcCache() {
    //
    console.log('gcCache');
  }
}

export default ArtifactsCacheServer;

const cache = new ArtifactsCacheServer(undefined, undefined, 3000);
