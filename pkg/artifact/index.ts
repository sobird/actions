import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import bodyParser from 'body-parser';
import express, { Express } from 'express';
import ip from 'ip';

import { trimSuffix } from '@/utils';

import type { AddressInfo } from 'node:net';

const GZIP_EXT = '.gz__';

class Artifact {
  constructor(
    public dir: string = path.join(os.homedir(), '.artifacts'),
    public outboundIP: string = ip.address(),
    public port: number = 0,
    public app: Express = express(),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    app.use(bodyParser.json());
    app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit: '50mb',
    }));

    app.get('/', (req, res) => {
      res.send({
        status: 'success',
      });
    });

    // Artifact Upload Prepare
    app.post('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

      res.json({ fileContainerResourceUrl: `${baseURL}/upload/${runId}` });
    });

    // Artifact Upload Blob
    // curl --silent --show-error --fail "http://127.0.0.1:3000/upload/1?itemPath=my-artifact/package.txt" --upload-file package.json
    app.put('/upload/:runId', (req, res) => {
      const { runId } = req.params;
      const { itemPath } = req.query;

      if (!itemPath) {
        res.json({
          message: 'Missing itemPath parameter',
        });
        return;
      }
      const safeRunPath = Artifact.SafeResolve(this.dir, runId);
      let safePath = Artifact.SafeResolve(safeRunPath, itemPath as string || '');
      fs.mkdirSync(path.dirname(safePath), { recursive: true });

      // 处理 gzip 编码的文件
      if (req.headers['content-encoding'] === 'gzip') {
        safePath += GZIP_EXT;
      }

      const writeStream = fs.createWriteStream(safePath, {
        flags: req.headers['content-range'] ? 'a' : 'w',
      });

      writeStream.on('error', (err) => {
        res.status(500).json({ message: err.message });
      });

      writeStream.on('close', () => {
        res.json({ message: 'success' });
      });

      req.pipe(writeStream);
    });

    // Finalize Artifact Upload
    app.patch('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      res.json({ message: 'success', runId });
    });

    // List Artifacts
    app.get('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      const safePath = Artifact.SafeResolve(this.dir, runId);
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

      try {
        const files = fs.readdirSync(safePath, {
          recursive: true,
          withFileTypes: true,
        });
        const filesInfo = files.filter((file) => {
          return file.isFile();
        }).map((file) => {
          return {
            name: file.name,
            fileContainerResourceUrl: `${baseURL}/download/${runId}`,
          };
        });
        res.json({ count: filesInfo.length, value: filesInfo });
      } catch (err) {
        return res.status(500).json({ message: (err as Error).message });
      }
    });

    // List Artifact Container
    app.get('/download/:runId', (req, res) => {
      const { runId } = req.params;
      const { itemPath } = req.query;

      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const safePath = Artifact.SafeResolve(this.dir, path.join(runId, itemPath as string || ''));

      try {
        const files = fs.readdirSync(safePath, {
          recursive: true,
          withFileTypes: true,
        });

        const filesInfo = files.filter((file) => {
          return file.isFile();
        }).map((file) => {
          let relPath = path.relative(safePath, path.join(file.parentPath, file.name));
          relPath = trimSuffix(relPath, GZIP_EXT);
          const filePath = path.join(itemPath as string || '', relPath);
          return {
            path: filePath,
            itemType: 'file',
            contentLocation: `${baseURL}/artifact/${runId}/${filePath.replace('\\', '/')}`,
          };
        });

        res.json({ value: filesInfo });
      } catch (err) {
        return res.status(500).json({ message: (err as Error).message });
      }
    });

    // Download Artifact File
    app.get('/artifact/:container/:path(*)', (req, res) => {
      const safePath = Artifact.SafeResolve(this.dir, Artifact.SafeResolve(req.params.container, req.params.path));
      try {
        fs.createReadStream(safePath, { encoding: 'utf-8' }).pipe(res);
      } catch (err) {
        res.setHeader('Content-Encoding', 'gzip');
        fs.createReadStream(safePath + GZIP_EXT, { encoding: 'utf-8' }).pipe(res);
      }
    });
  }

  async serve() {
    return new Promise((resolve) => {
      const server = this.app.listen(this.port, this.outboundIP, () => {
        // console.log('Server running at:', (server.address() as AddressInfo).port);
        const { address, port } = server.address() as AddressInfo;
        // serverAddress
        resolve(`http://${address}:${port}`);
      });
    });
  }

  static SafeResolve(baseDir:string, relPath:string) {
    return trimSuffix(path.join(baseDir, path.normalize(path.join(path.sep, relPath))), path.sep);
  }
}

export default Artifact;
