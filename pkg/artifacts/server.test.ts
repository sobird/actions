import request from 'supertest';
import fs from 'fs';
import path from 'path';
import ArtifactServer from './server'; // 引入你的 Express 应用

export default ArtifactServer;

const {
  app, dir,
} = new ArtifactServer(undefined, undefined, 3000);

describe('Artifact Server Test', () => {
  // 设置 mock-fs
  beforeAll(() => {
    //
  });

  // 恢复原始的文件系统
  afterAll(() => {

  });

  const filename = 'test.txt';
  const runId = 'runId';
  const itemPath = 'test';
  const expectFileName = path.join(dir, runId, itemPath);

  it('POST /_apis/pipelines/workflows/:runId/artifacts', async () => {
    const response = await request(app).post(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.fileContainerResourceUrl).includes(`/upload/${runId}`);
  });

  it('patch /_apis/pipelines/workflows/:runId/artifacts', async () => {
    const response = await request(app).patch(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('success');
  });

  it('PUT /upload/:runId?itemPath=[itemPath]', async () => {
    // 使用 supertest 发送一个模拟的文件上传请求
    const response = await request(app).put(`/upload/${runId}?itemPath=${itemPath}`)
      .attach('file', Buffer.from('file content123'), filename);

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
  });

  fs.unlinkSync(expectFileName);
});
