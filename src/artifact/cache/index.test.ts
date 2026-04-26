import fs from 'fs';
import path from 'path';

import request from 'supertest';

import { createAllDir, createTestFile } from '@/utils/test';

import ArtifactCache from '.';

const { app, dir, storage } = new ArtifactCache(createAllDir('artifact'));

describe('Artifact Cache Server Test', () => {
  const filename = 'test.txt';
  const cacheId = 1;
  const itemPath = 'test';
  const expectFileName = path.join(dir, `${cacheId}`, itemPath);

  it('Missing cache', async () => {
    const response = await request(app).get('/_apis/artifactcache/cache').query({
      keys: 'Linux-yarn-373d5d0423376133b400f89affe63b8d86e2e9698df297856d7d8c4c8da3ad91,Linux-yarn-',
      version: '95d85d065bf84fdcb56573f0500a02d74aacea5ad50dda358b754d0ff52b5d02',
    });
    expect(response.statusCode).toBe(204);
  });

  it('Reserve cache', async () => {
    const response = await request(app).post('/_apis/artifactcache/caches').send({ key: 'Linux-npm-xxxx', version: '0.0.1' }).expect(200);

    expect(response.statusCode).toBe(200);
    expect(response.body.cacheId).toBeGreaterThan(0);
  });

  it('Upload cache file parts with a cache id', async () => {
    const file = createTestFile('artifact-cache-test', 'test file content');
    const cacheTmpname = storage.tmpName(cacheId, 0);
    const fileBuffer = fs.readFileSync(file);

    const response = await request(app).patch(`/_apis/artifactcache/caches/${cacheId}`)
      .set('Content-Type', 'application/octet-stream')
      .send(fileBuffer);

    // console.log('response', response);

    // fileStream.pipe(response);

    expect(response.statusCode).toBe(200);
    // expect(fs.existsSync(cacheTmpname)).toBeTruthy();
  });

  it('Commit the cache parts upload', async () => {
    const cacheFilename = storage.filename(cacheId);
    const response = await request(app).post(`/_apis/artifactcache/caches/${cacheId}`)
      .send({ size: 221 });

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(cacheFilename)).toBeTruthy();
  });

  // it('PUT /upload/:cacheId without itemPath', async () => {
  //   // 使用 supertest 发送一个模拟的文件上传请求
  //   const response = await request(app).put(`/upload/${cacheId}`)
  //     .attach('file', Buffer.from('file content123'), filename);

  //   expect(response.statusCode).toBe(200);
  //   expect(response.body.message).toBe('Missing itemPath parameter');
  // });

  it('Clean Cache', async () => {
    const response = await request(app).post('/_apis/artifactcache/clean');
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBe(1);
  });

  // fs.unlinkSync(expectFileName);
});
