import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import bodyParser from 'body-parser';
import express, { Express } from 'express';
import ip from 'ip';
import { totalist } from 'totalist/sync';

import type { AddressInfo } from 'node:net';

class ArtifactServer {
  constructor(
    public dir: string = path.join(os.homedir(), '.artifacts'),
    public host: string = ip.address(),
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

    // 获取上传地址
    app.post('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      console.log('runId', runId);
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

      res.json({ fileContainerResourceUrl: `${baseURL}/upload/${runId}` });
    });

    app.patch('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;

      res.json({ message: 'success', runId });
    });

    // 获取artifaces下载列表
    app.get('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
      const { runId } = req.params;
      const artifacts = new Set();
      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const safePath = path.join(this.dir, path.normalize(runId));
      totalist(safePath, (relPath) => {
        const name = relPath.replace('\\', '/');
        const fileDetails = {
          name: name.split('/')[0],
          fileContainerResourceUrl: `${baseURL}/download/${runId}`,
        };
        artifacts.add(fileDetails);
      });
      console.log(artifacts);
      res.status(200).json({ count: artifacts.size, value: [...artifacts] });
    });

    // 获取artifaces runId下载列表
    app.get('/download/:container', (req, res) => {
      const { container } = req.params;
      const { itemPath } = req.query;

      const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
      const safePath = path.join(this.dir, container, itemPath as string || '');

      const files = new Set();
      totalist(safePath, (relPath, absPath) => {
        console.log(relPath);
        console.log(absPath);
        files.add({
          path: path.normalize(relPath),
          itemType: 'file',
          contentLocation: `${baseURL}/download/${container}/${relPath.replace('\\', '/')}`,
        });
      });
      res.status(200).json({ value: [...files] });
    });

    // 下载文件
    app.get('/download/:container/:path(*)', (req, res) => {
      const safePath = path.join(this.dir, req.params.container, req.params.path);
      fs.createReadStream(safePath, { encoding: 'utf-8' }).pipe(res);
    });

    // 上传artifacts
    app.put('/upload/:runId', (req, res) => {
      const { runId } = req.params;
      const { itemPath } = req.query;
      if (!itemPath) {
        res.json({
          message: 'Missing itemPath parameter',
        });
        return;
      }
      const safePath = path.join(this.dir, runId, itemPath as string || '');
      fs.mkdirSync(path.dirname(safePath), { recursive: true });

      // 写入文件
      const fileWriteStream = fs.createWriteStream(safePath);
      req.pipe(fileWriteStream);

      // 响应上传成功
      fileWriteStream.on('close', () => {
        res.json(JSON.stringify({ message: 'success' }));
      });
    });

    const server = app.listen(port, this.host, () => {
      console.log('Server running at:', (server.address() as AddressInfo).port);
    });
  }
}

export default ArtifactServer;

// HTTP 服务器
// const server = http.createServer((req, res) => {
//   const { pathname, searchParams } = new URL(req.url || '', `http://${req.headers.host}`);
//   const itemPath = searchParams.get('itemPath') || '';

//   // const safePath = path.join(safePath, itemPath);

//   // 安全路径处理
//   const safeResolve = (baseDir: string, relPath: string) => {
//     return path.join(baseDir, path.normalize(relPath));
//   };

//   // /_apis/pipelines/workflows/:runId/artifacts
//   let pathMatch = pathname.match(/\/_apis\/pipelines\/workflows\/([^/]+)\/artifacts/);
//   if (pathMatch && req.method === 'GET') {
//     const runId = pathMatch[1];
//     const safePath = path.join(BASE_DIR, runId);
//     const dirContent = fs.readdirSync(safePath);
//     const fileList = dirContent.map((file) => {
//       return {
//         name: file,
//         fileContainerResourceUrl: `/download/${runId}?itemPath=${encodeURIComponent(file)}`,
//       };
//     });

//     res.statusCode = 200;
//     res.end(JSON.stringify({ count: fileList.length, value: fileList }));
//   }
//   if (pathMatch && req.method === 'POST') {
//     const runId = pathMatch[1];
//     res.statusCode = 200;
//     res.end(JSON.stringify({ fileContainerResourceUrl: `/upload/${runId}` }));
//   }
//   if (pathMatch && req.method === 'PATCH') {
//     // const runId = pathMatch[1];
//     res.statusCode = 200;
//     res.end(JSON.stringify({ message: 'success' }));
//   }

//   // /upload/:runId
//   pathMatch = pathname.match(/\/upload\/([^/]+)/);
//   if (pathMatch && req.method === 'PUT') {
//     const runId = pathMatch[1];
//     const safePath = path.join(BASE_DIR, runId);
//     const gzip = req.headers['content-encoding'] === 'gzip';
//     const itemPathWithGzip = gzip ? `${itemPath}.gz__` : itemPath;
//     const filePath = safeResolve(safePath, itemPathWithGzip);

//     // 创建目录
//     fs.mkdirSync(path.dirname(filePath), { recursive: true });

//     // 写入文件
//     const fileWriteStream = fs.createWriteStream(filePath);
//     req.pipe(fileWriteStream);

//     // 响应上传成功
//     fileWriteStream.on('close', () => {
//       res.statusCode = 200;
//       res.end(JSON.stringify({ message: 'success' }));
//     });
//   }

//   // /download/:container
//   pathMatch = pathname.match(/\/download\/([^/]+)/);
//   if (pathMatch && req.method === 'GET') {
//     const container = pathMatch[1];
//     const safePath = path.join(BASE_DIR, container, itemPath);

//     const files: { path: string; itemType: string; contentLocation: string; }[] = [];

//     fs.readdirSync(safePath, { withFileTypes: true }).forEach((file) => {
//       if (file.isDirectory()) {
//         const filePath = path.join(safePath, file.name);
//         const relPath = path.relative(safePath, filePath);
//         const cleanRelPath = relPath.endsWith('.gz__') ? relPath.slice(0, -5) : relPath;
//         const contentLocation = `http://${req.headers.host}:${PORT}/artifact/${container}/${itemPath}/${cleanRelPath}`;
//         files.push({
//           path: path.posix.join(itemPath, relPath),
//           itemType: 'file',
//           contentLocation,
//         });
//       }
//     });

//     console.log('files', files);

//     res.end(JSON.stringify({
//       value: files,
//     }));
//   }

//   // /artifact/*path
//   pathMatch = pathname.match(/\/artifact\/([^/]+)/);
//   if (pathMatch && req.method === 'GET') {
//     const artifactPath = pathMatch[1];
//     const safePath = path.join(BASE_DIR, artifactPath);

//     // 检查文件是否存在
//     fs.access(safePath, fs.constants.F_OK, (err) => {
//       if (!err) {
//       // 文件存在，设置Content-Encoding为gzip（如果需要）
//         const isGzip = path.basename(safePath).endsWith('.gz__');
//         if (isGzip) {
//           res.setHeader('Content-Encoding', 'gzip');
//         }

//         // 传输文件流
//         const fileStream = fs.createReadStream(safePath);
//         fileStream.pipe(res);

//         fileStream.on('error', () => {
//         // 如果文件流发生错误，返回404
//           res.statusCode = 404;
//           res.end('File not found');
//         });
//       } else {
//       // 文件不存在，返回404
//         res.statusCode = 404;
//         res.end('File not found');
//       }
//     });
//   }
// });

// // 启动服务器
// server.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });
