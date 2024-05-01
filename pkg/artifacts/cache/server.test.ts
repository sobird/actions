import fs from 'fs';
import path from 'path';

import request from 'supertest';

import ArtifactsCacheServer from './server';

const {
  app, dir,
} = new ArtifactsCacheServer(undefined, undefined, 3000);

describe('Artifact Server Test', () => {
  // 设置 mock-fs
  beforeAll(() => {
    //
  });

  // 恢复原始的文件系统
  afterAll(() => {

  });

  const filename = 'test.txt';
  const cacheId = 1;
  const itemPath = 'test';
  const expectFileName = path.join(dir, `${cacheId}`, itemPath);

  it('Missing cache', async () => {
    const response = await request(app).get('/_apis/artifactcache/cache')
      .query({
        keys: 'Linux-yarn-373d5d0423376133b400f89affe63b8d86e2e9698df297856d7d8c4c8da3ad91,Linux-yarn-',
        version: '95d85d065bf84fdcb56573f0500a02d74aacea5ad50dda358b754d0ff52b5d02',
      });
    expect(response.statusCode).toBe(204);
  });

  it('Reserve a cache - POST /_apis/artifactcache/caches', async () => {
    const response = await request(app).post('/_apis/artifactcache/caches')
      .send({ key: 'Linux-npm-xxxx', version: '0.0.1' })
      .expect(200);
    expect(response.statusCode).toBe(200);
    expect(response.body.cacheId).toBeGreaterThan(0);
  });

  it('Upload cache file parts with a cache id', async () => {
    const response = await request(app).patch(`/_apis/artifactcache/caches/${cacheId}`)
      .set('Content-Range', 'bytes 0-102/10000')
      .attach('file', Buffer.from('file content123'), filename);

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(expectFileName)).toBeTruthy();
  });

  // it('PUT /upload/:cacheId without itemPath', async () => {
  //   // 使用 supertest 发送一个模拟的文件上传请求
  //   const response = await request(app).put(`/upload/${cacheId}`)
  //     .attach('file', Buffer.from('file content123'), filename);

  //   expect(response.statusCode).toBe(200);
  //   expect(response.body.message).toBe('Missing itemPath parameter');
  // });

  // it('GET /_apis/pipelines/workflows/:cacheId/artifacts', async () => {
  //   const response = await request(app).get(`/_apis/pipelines/workflows/${cacheId}/artifacts`);
  //   expect(response.statusCode).toBe(200);
  //   expect(response.body.count).toBe(1);
  // });

  // fs.unlinkSync(expectFileName);
});
