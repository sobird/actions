import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import request from 'supertest';

import Artifact from '.';

const tmpdir = path.join(os.tmpdir(), 'artifacts');
const { app, dir } = new Artifact(tmpdir, undefined, 3000);

console.log('tmpdir', tmpdir);
// 设置 mock-fs
beforeAll(() => {
  //
});

afterAll(() => {
  fs.rmdirSync(tmpdir, { recursive: true });
});

describe('Artifact Server Test', () => {
  const filename = 'file.txt';
  const runId = '1234';
  const itemPath = 'file.txt';
  const expectFileName = path.join(dir, runId, itemPath);

  it('POST /_apis/pipelines/workflows/:runId/artifacts', async () => {
    const response = await request(app).post(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.fileContainerResourceUrl).includes(`/upload/${runId}`);
  });

  it('Patch /_apis/pipelines/workflows/:runId/artifacts', async () => {
    const response = await request(app).patch(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('success');
  });

  it('PUT /upload/:runId?itemPath=[itemPath]', async () => {
    const response = await request(app).put(`/upload/${runId}?itemPath=${itemPath}`)
      .attach('file', Buffer.from('content'), filename);

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(expectFileName)).toBeTruthy();
  });

  it('PUT /upload/:runId without itemPath', async () => {
    // 使用 supertest 发送一个模拟的文件上传请求
    const response = await request(app).put(`/upload/${runId}`)
      .attach('file', Buffer.from('file content123'), filename);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Missing itemPath parameter');
  });

  it('GET /_apis/pipelines/workflows/:runId/artifacts', async () => {
    const response = await request(app).get(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.value[0].name).toBe('file.txt');
    expect(response.body.value[0].fileContainerResourceUrl).includes(`/download/${runId}`);
  });

  it('GET /download/:container', async () => {
    const response = await request(app).get(`/download/${runId}`);
    console.log('response.body', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.value[0].name).toBe('file.txt');
    expect(response.body.value[0].fileContainerResourceUrl).includes(`/download/${runId}`);
  });
});
