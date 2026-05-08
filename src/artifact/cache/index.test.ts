import fs from 'node:fs';

import request from 'supertest';

import { createAllDir, createTestFile } from '@/utils/test';

import ArtifactCache from '.';

const { app, storage } = new ArtifactCache(createAllDir('artifact'));

describe('Artifact Cache Server Test', () => {
  const cacheId = 1;

  it('Missing cache', async () => {
    const response = await request(app).get('/_apis/artifactcache/cache').query({
      keys: 'Linux-yarn-373d5d0423376133b400f89affe63b8d86e2e9698df297856d7d8c4c8da3ad91,Linux-yarn-',
      version: '95d85d065bf84fdcb56573f0500a02d74aacea5ad50dda358b754d0ff52b5d02',
    });
    expect(response.statusCode).toBe(204);
  });

  it('Reserve cache', async () => {
    const response = await request(app)
      .post('/_apis/artifactcache/caches')
      .send({ key: 'Linux-npm-xxxx', version: '0.0.1' })
      .expect(200);

    expect(response.statusCode).toBe(200);
    expect(response.body.cacheId).toBeGreaterThan(0);
  });

  it('Upload cache file parts with a cache id', async () => {
    const file = createTestFile('artifact-cache-test', 'test file content');
    const cacheTmpname = storage.getChunkPath(cacheId, 0);
    const fileBuffer = fs.readFileSync(file);

    const response = await request(app)
      .patch(`/_apis/artifactcache/caches/${cacheId}`)
      .set('Content-Type', 'application/octet-stream')
      .send(fileBuffer);

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(cacheTmpname)).toBeTruthy();
  });

  it('Commit the cache parts upload', async () => {
    const cacheFilename = storage.getFinalPath(cacheId);
    const response = await request(app).post(`/_apis/artifactcache/caches/${cacheId}`).send({ size: 17 });

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(cacheFilename)).toBeTruthy();
  });

  it('Clean Cache', async () => {
    const response = await request(app).post('/_apis/artifactcache/clean');
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBe(1);
  });
});
