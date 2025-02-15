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
  // fs.rmdirSync(tmpdir, { recursive: true });
});

describe('Artifact Server Test', () => {
  const filename = 'file.txt';
  const runId = '1234';
  const itemPath = 'file.txt';
  const expectFileName = path.join(dir, runId, itemPath);

  it('Test Artifact Upload Prepare', async () => {
    const response = await request(app).post(`/_apis/pipelines/workflows/${runId}/artifacts`);
    console.log('response.body.fileContainerResourceUrl', response.body.fileContainerResourceUrl);
    expect(response.statusCode).toBe(200);
    expect(response.body.fileContainerResourceUrl).includes(`/upload/${runId}`);
  });

  it('Test Finalize Artifact Upload', async () => {
    const response = await request(app).patch(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('success');
  });

  it('Test Artifact Upload Blob with itemPath', async () => {
    const res = fs.readFileSync('package.json');

    const response = await request(app).put(`/upload/${runId}?itemPath=${itemPath}`)
      .attach('file', res, {
        filename,
      });

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(expectFileName)).toBeTruthy();
  });

  it('Test Artifact Upload Blob Without itemPath', async () => {
    // 使用 supertest 发送一个模拟的文件上传请求
    const response = await request(app).put(`/upload/${runId}`)
      .attach('file', Buffer.from('file content123'), filename);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Missing itemPath parameter');
  });

  it('Test List Artifacts', async () => {
    const response = await request(app).get(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.value[0].name).toBe('file.txt');
    expect(response.body.value[0].fileContainerResourceUrl).includes(`/download/${runId}`);
  });

  it('Test List Artifact Container', async () => {
    const response = await request(app).get(`/download/${runId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.value[0].path).toBe('file.txt');
    expect(response.body.value[0].contentLocation).includes(`/artifact/${runId}`);
  });

  it('Test Download Artifact File', async () => {
    const response = await request(app).get(`/artifact/${runId}/${filename}`);
    expect(response.statusCode).toBe(200);
  });
});

// curl --silent --show-error --fail "http://127.0.0.1:4000/upload/1?itemPath=my-artifact/secret.txt" --upload-file package.json

describe('Test Mkdir FsImpl SafeResolve', () => {
  const baseDir = '/foo/bar';

  const tests = {
    simple: { input: 'baz', want: '/foo/bar/baz' },
    nested: { input: 'baz/blue', want: '/foo/bar/baz/blue' },
    'dots in middle': { input: 'baz/../../blue', want: '/foo/bar/blue' },
    'leading dots': { input: '../../parent', want: '/foo/bar/parent' },
    'root path': { input: '/root', want: '/foo/bar/root' },
    root: { input: '/', want: '/foo/bar' },
    empty: { input: '', want: '/foo/bar' },
  };

  Object.entries(tests).forEach(([name, tc]) => {
    it(name, () => {
      expect(Artifact.SafeResolve(baseDir, tc.input)).toBe(tc.want);
    });
  });

  const runId = '2';
  const itemPath = '../../some/file';
  const filename = 'file';
  const expectFileName = Artifact.SafeResolve(Artifact.SafeResolve(dir, runId), itemPath);
  it('Test Artifact Upload Blob Unsafe Path', async () => {
    const res = fs.readFileSync('package.json');

    const response = await request(app).put(`/upload/${runId}?itemPath=${itemPath}`)
      .attach('file', res, {
        filename,
      });

    expect(response.statusCode).toBe(200);
    expect(fs.existsSync(expectFileName)).toBeTruthy();
  });

  it('Test Download Artifact File Unsafe Path', async () => {
    const response = await request(app).get(`/artifact/${runId}/${itemPath}`);
    expect(response.statusCode).toBe(404);
  });
});
