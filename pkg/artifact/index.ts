/**
 * GitHub Actions Artifacts V4 Server
 *
 * @see https://github.com/actions/toolkit/tree/main/packages/artifact
 * @see https://github.com/nektos/act/blob/master/pkg/artifacts/arifacts_v4.go
 * @see https://github.com/actions/upload-artifact
 * @see https://github.com/actions/download-artifact
 *
 * @envs
 * ACTIONS_RUNTIME_TOKEN
 * ACTIONS_RESULTS_URL
 * GITHUB_SERVER_URL
 * GITHUB_WORKSPACE
 *
 * GitHub Actions Artifacts V4 API Simple Description
 *
 * 1. Upload artifact
 * 1.1. CreateArtifact
 * Post: /twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact
 * Request:
 * {
 *   "workflow_run_backend_id": "21",
 *   "workflow_job_run_backend_id": "49",
 *   "name": "test",
 *   "version": 4
 * }
 * Response:
 * {
 *   "ok": true,
 *   "signedUploadUrl": "http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/UploadArtifact?sig=mO7y35r4GyjN7fwg0DTv3-Fv1NDXD84KLEgLpoPOtDI=&expires=2024-01-23+21%3A48%3A37.20833956+%2B0100+CET&artifactName=test&taskID=75"
 * }
 *
 * 1.2. Upload Zip Content to Blobstorage (unauthenticated request)
 * PUT: http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/UploadArtifact?sig=mO7y35r4GyjN7fwg0DTv3-Fv1NDXD84KLEgLpoPOtDI=&expires=2024-01-23+21%3A48%3A37.20833956+%2B0100+CET&artifactName=test&taskID=75&comp=block
 * 1.3. Continue Upload Zip Content to Blobstorage (unauthenticated request), repeat until everything is uploaded
 * PUT: http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/UploadArtifact?sig=mO7y35r4GyjN7fwg0DTv3-Fv1NDXD84KLEgLpoPOtDI=&expires=2024-01-23+21%3A48%3A37.20833956+%2B0100+CET&artifactName=test&taskID=75&comp=appendBlock
 * 1.4. Unknown xml payload to Blobstorage (unauthenticated request), ignored for now
 * PUT: http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/UploadArtifact?sig=mO7y35r4GyjN7fwg0DTv3-Fv1NDXD84KLEgLpoPOtDI=&expires=2024-01-23+21%3A48%3A37.20833956+%2B0100+CET&artifactName=test&taskID=75&comp=blockList
 * 1.5. FinalizeArtifact
 * Post: /twirp/github.actions.results.api.v1.ArtifactService/FinalizeArtifact
 * Request
 * {
 *   "workflow_run_backend_id": "21",
 *   "workflow_job_run_backend_id": "49",
 *   "name": "test",
 *   "size": "2097",
 *   "hash": "sha256:b6325614d5649338b87215d9536b3c0477729b8638994c74cdefacb020a2cad4"
 * }
 * Response
 * {
 *   "ok": true,
 *   "artifactId": "4"
 * }
 * 2. Download artifact
 * 2.1. ListArtifacts and optionally filter by artifact exact name or id
 * Post: /twirp/github.actions.results.api.v1.ArtifactService/ListArtifacts
 * Request
 * {
 *   "workflow_run_backend_id": "21",
 *   "workflow_job_run_backend_id": "49",
 *   "name_filter": "test"
 * }
 * Response
 * {
 *   "artifacts": [
 *     {
 *       "workflowRunBackendId": "21",
 *       "workflowJobRunBackendId": "49",
 *       "databaseId": "4",
 *       "name": "test",
 *       "size": "2093",
 *       "createdAt": "2024-01-23T00:13:28Z"
 *     }
 *   ]
 * }
 * 2.2. GetSignedArtifactURL get the URL to download the artifact zip file of a specific artifact
 * Post: /twirp/github.actions.results.api.v1.ArtifactService/GetSignedArtifactURL
 * Request
 * {
 *   "workflow_run_backend_id": "21",
 *   "workflow_job_run_backend_id": "49",
 *   "name": "test"
 * }
 * Response
 * {
 *   "signedUrl": "http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/DownloadArtifact?sig=wHzFOwpF-6220-5CA0CIRmAX9VbiTC2Mji89UOqo1E8=&expires=2024-01-23+21%3A51%3A56.872846295+%2B0100+CET&artifactName=test&taskID=76"
 * }
 * 2.3. Download Zip from Blobstorage (unauthenticated request)
 * GET: http://localhost:3000/twirp/github.actions.results.api.v1.ArtifactService/DownloadArtifact?sig=wHzFOwpF-6220-5CA0CIRmAX9VbiTC2Mji89UOqo1E8=&expires=2024-01-23+21%3A51%3A56.872846295+%2B0100+CET&artifactName=test&taskID=76
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import bodyParser from 'body-parser';
import express, { Express, Handler, Request } from 'express';
import ip from 'ip';
import log4js, { Logger } from 'log4js';

import { trimSuffix } from '@/utils';

import type { AddressInfo } from 'node:net';

const GZIP_EXT = '.gz__';
const DEFAULT_ARTIFACT_DIR = path.join(os.homedir(), '.artifacts');

export function safeResolve(baseDir:string, relPath:string) {
  // return path.join(baseDir, path.normalize(relPath).replace(/\/+$/, ''));
  return trimSuffix(path.join(baseDir, path.normalize(path.join(path.sep, relPath))), path.sep);
}
// Build Signature
function buildSignature(endpoint: string, expires: string, artifactName: string, taskID: number) {
  const hmac = crypto.createHmac('sha256', Buffer.from([0xba, 0xdb, 0xee, 0xf0]));
  hmac.update(endpoint);
  hmac.update(expires);
  hmac.update(artifactName);
  hmac.update(taskID.toString());
  return hmac.digest('base64url');
}

// Verify Signature
function verifySignature(req: Request, endpoint: string) {
  const {
    sig, expires, artifactName, taskID,
  } = req.query as { sig: string, expires: string, artifactName: string, taskID: string };
  const expectedSig = buildSignature(endpoint, expires, artifactName, parseInt(taskID, 10));
  if (sig !== expectedSig) {
    throw new Error('Unauthorized');
  }
  if (new Date(expires) < new Date()) {
    throw new Error('Link expired');
  }
  return { taskID: parseInt(taskID, 10), artifactName };
}

// Build Artifact URL
function buildArtifactURL(baseURL: string, prefix: string, endpoint: string, artifactName: string, taskID:number) {
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const sig = buildSignature(endpoint, expires, artifactName, taskID);
  return `${baseURL}${prefix}/${endpoint}?sig=${sig}&expires=${encodeURIComponent(expires)}&artifactName=${encodeURIComponent(artifactName)}&taskID=${taskID}`;
}

class Artifact {
  constructor(
    public dir: string = DEFAULT_ARTIFACT_DIR,
    public logger: Logger = log4js.getLogger('ArtifactCache'),
    public app: Express = express(),
  ) {
    if (!this.dir) {
      return;
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    app.set('query parser', 'simple');
    app.use(bodyParser.json());
    app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit: '50mb',
    }));

    app.use(this.middleware);
    app.get('/', (req, res) => {
      res.send({
        status: 'success',
      });
    });
    // v4
    // Create Artifact
    app.post('/twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact', (req, res) => {
      const { workflowRunBackendId, name } = req.body;
      const runID = parseInt(workflowRunBackendId, 10);

      const safeRunPath = safeResolve(this.dir, runID.toString());
      const safePath = safeResolve(safeRunPath, `${name}.zip`);

      // 创建文件
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, '');

      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const signedUploadUrl = buildArtifactURL(baseURL, '/twirp/github.actions.results.api.v1.ArtifactService', 'UploadArtifact', name, runID);

      res.json({
        ok: true,
        signedUploadUrl,
      });
    });

    // Upload Artifact
    app.put('/twirp/github.actions.results.api.v1.ArtifactService/UploadArtifact', (req, res) => {
      try {
        const { taskID, artifactName } = verifySignature(req, 'UploadArtifact');
        const { comp } = req.query;

        const safeRunPath = safeResolve(this.dir, taskID.toString());
        const safePath = safeResolve(safeRunPath, `${artifactName}.zip`);

        if (comp === 'block' || comp === 'appendBlock') {
          const file = fs.createWriteStream(safePath, { flags: 'a' });
          req.pipe(file);
          file.on('finish', () => {
            res.status(201).send('appended');
          });
        } else if (comp === 'blocklist') {
          res.status(201).send('created');
        } else {
          res.status(400).send('Invalid comp parameter');
        }
      } catch (err) {
        res.status(401).send((err as Error).message);
      }
    });

    // 列出 Artifacts
    app.post('/twirp/github.actions.results.api.v1.ArtifactService/ListArtifacts', (req, res) => {
      const { workflowRunBackendId, nameFilter } = req.body;
      const runID = parseInt(workflowRunBackendId, 10);

      const safePath = safeResolve(this.dir, runID.toString());

      const entries = fs.readdirSync(safePath);
      const artifacts = entries
        .filter((entry) => { return !nameFilter || entry === nameFilter; })
        .map((entry) => {
          const stats = fs.statSync(path.join(safePath, entry));
          return {
            name: entry,
            createdAt: stats.mtime.toISOString(),
            size: stats.size,
            workflowRunBackendId,
          };
        });

      res.json({ artifacts });
    });

    // Get SignedArtifact URL
    app.post('/twirp/github.actions.results.api.v1.ArtifactService/GetSignedArtifactURL', (req, res) => {
      const { workflowRunBackendId, name } = req.body;
      const runID = parseInt(workflowRunBackendId, 10);

      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const signedUrl = buildArtifactURL(baseURL, '/twirp/github.actions.results.api.v1.ArtifactService', 'DownloadArtifact', name, runID);

      res.json({ signedUrl });
    });

    // 下载 Artifact
    app.get('/twirp/github.actions.results.api.v1.ArtifactService/DownloadArtifact', (req, res) => {
      try {
        const { taskID, artifactName } = verifySignature(req, 'DownloadArtifact');

        const safeRunPath = safeResolve(this.dir, taskID.toString());
        const safePath = safeResolve(safeRunPath, `${artifactName}.zip`);

        const file = fs.createReadStream(safePath);
        file.pipe(res);
      } catch (err) {
        res.status(401).send((err as Error).message);
      }
    });

    // Delete Artifact
    app.post('/twirp/github.actions.results.api.v1.ArtifactService/DeleteArtifact', (req, res) => {
      const { workflowRunBackendId, name } = req.body;
      const runID = parseInt(workflowRunBackendId, 10);

      const safeRunPath = safeResolve(this.dir, runID.toString());
      const safePath = safeResolve(safeRunPath, name);

      fs.rmSync(safePath, { recursive: true, force: true });

      res.json({ ok: true });
    });

    // v3
    // Artifact Upload Prepare
    app.post('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

      res.json({
        fileContainerResourceUrl: `${baseURL}/upload/${runId}`,
      });
    });

    // Artifact Upload Blob
    // curl --silent --show-error --fail "http://127.0.0.1:3000/upload/1?itemPath=my-artifact/package.txt" --upload-file package.json
    app.put('/upload/:runId', (req, res) => {
      const { runId } = req.params;
      const { itemPath } = req.query as { itemPath: string };
      const isGzip = req.headers['content-encoding'] === 'gzip';

      if (!itemPath) {
        res.json({
          message: 'Missing itemPath parameter',
        });
        return;
      }

      const safeRunPath = safeResolve(this.dir, runId);
      const safePath = safeResolve(safeRunPath, isGzip ? `${itemPath}${GZIP_EXT}` : itemPath);
      fs.mkdirSync(path.dirname(safePath), { recursive: true });

      // 处理 gzip 编码的文件
      // if (req.headers['content-encoding'] === 'gzip') {
      //   safePath += GZIP_EXT;
      // }

      const writeStream = fs.createWriteStream(safePath, {
        flags: req.headers['content-range'] ? 'a' : 'w',
      });

      writeStream.on('error', (err) => {
        res.status(500).json({ message: 'File upload failed', error: err.message });
      });

      writeStream.on('finish', () => {
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
      const safePath = safeResolve(this.dir, runId);
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

      fs.readdir(safePath, (err, files) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to list files', error: err.message });
        }

        res.json({
          count: files.length,
          value: files.map((file) => {
            return {
              name: file,
              fileContainerResourceUrl: `${baseURL}/download/${runId}`,
            };
          }),
        });
      });

      // try {
      //   const files = fs.readdirSync(safePath, {
      //     recursive: true,
      //     withFileTypes: true,
      //   });
      //   const filesInfo = files.filter((file) => {
      //     return file.isFile();
      //   }).map((file) => {
      //     return {
      //       name: file.name,
      //       fileContainerResourceUrl: `${baseURL}/download/${runId}`,
      //     };
      //   });
      //   res.json({ count: filesInfo.length, value: filesInfo });
      // } catch (err) {
      //   return res.status(500).json({ message: (err as Error).message });
      // }
    });

    // List Artifact Container
    app.get('/download/:runId', (req, res) => {
      const { runId } = req.params;
      const { itemPath } = req.query;

      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const safePath = safeResolve(this.dir, path.join(runId, itemPath as string || ''));

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
      const safePath = safeResolve(this.dir, safeResolve(req.params.container, req.params.path));
      try {
        fs.createReadStream(safePath, { encoding: 'utf-8' }).pipe(res);
      } catch (err) {
        res.setHeader('Content-Encoding', 'gzip');
        fs.createReadStream(safePath + GZIP_EXT, { encoding: 'utf-8' }).pipe(res);
      }
    });
  }

  private middleware: Handler = (req, res, next) => {
    // const Authorization = req.get('Authorization');
    // if (req.get('Authorization') !== `Bearer ${process.env.AUTH_KEY}`) {
    //   res.status(401).json({ message: 'You are not authorized' });
    // }
    this.logger.debug(`Request method: ${req.method}, Request url: ${req.originalUrl}`);
    next();
  };

  async serve(port: number = 0, address: string = ip.address() || 'localhost') {
    if (!this.dir) {
      return '';
    }
    return new Promise<string>((resolve) => {
      const server = this.app.listen(port, () => {
        const addressInfo = server.address() as AddressInfo;
        resolve(`http://${address}:${addressInfo.port}/`);
      });
    });
  }
}

export default Artifact;
