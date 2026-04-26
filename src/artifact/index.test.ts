import fs from 'node:fs';
import path from 'node:path';

import request from 'supertest';

import { createAllDir } from '@/utils/test';

import Artifact, { safeResolve } from '.';

const testDir = createAllDir('artifacts');
const { app, dir } = new Artifact(testDir);

beforeAll(() => {
  //
});

afterAll(() => {
  // fs.rmdirSync(tmpdir, { recursive: true });
});

describe('Artifact Server', () => {
  const content = 'content';
  const runId = '1234';
  const itemPath = 'file.txt';
  const expectFileName = path.join(dir, runId, itemPath);

  it('should prepare artifact upload', async () => {
    const res = await request(app).post(`/_apis/pipelines/workflows/${runId}/artifacts`);
    expect(res.body.fileContainerResourceUrl).includes(`/upload/${runId}`);
  });

  it('should upload artifact blob', async () => {
    const res = await request(app)
      .put(`/upload/${runId}?itemPath=${itemPath}`)
      .send(content)
      .expect(200);

    const expectContent = fs.readFileSync(expectFileName).toString();
    expect(res.body.message).toBe('success');
    expect(expectContent).toBe(content);
  });

  it('should not upload artifact blob without itemPath', async () => {
    const res = await request(app)
      .put(`/upload/${runId}`)
      .send(content)
      .expect(200);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Missing itemPath parameter');
  });

  it('should finalize artifact upload', async () => {
    const res = await request(app)
      .patch(`/_apis/pipelines/workflows/${runId}/artifacts`)
      .expect(200);

    expect(res.body.message).toBe('success');
  });

  it('should list artifacts', async () => {
    const res = await request(app)
      .get(`/_apis/pipelines/workflows/${runId}/artifacts`)
      .expect(200);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.value[0].name).toBe('file.txt');
    expect(res.body.value[0].fileContainerResourceUrl).includes(`/download/${runId}`);
  });

  it('Test List Artifact Container', async () => {
    const res = await request(app).get(`/download/${runId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.value[0].path).toBe('file.txt');
    expect(res.body.value[0].contentLocation).includes(`/artifact/${runId}`);
  });

  it('should download artifact file', async () => {
    const res = await request(app)
      .get(`/artifact/${runId}/${itemPath}`)
      .expect(200);

    expect(res.text).toBe(content);
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
      expect(safeResolve(baseDir, tc.input)).toBe(tc.want);
    });
  });

  const runId = '2';
  const itemPath = '../../some/file';
  const content = 'content';

  const expectFileName = safeResolve(safeResolve(dir, runId), itemPath);
  it('Test Artifact Upload Blob Unsafe Path', async () => {
    const res = await request(app)
      .put(`/upload/${runId}?itemPath=${itemPath}`)
      .send(content)
      .expect(200);

    expect(res.statusCode).toBe(200);
    expect(fs.existsSync(expectFileName)).toBeTruthy();
  });

  it('Test Download Artifact File Unsafe Path', async () => {
    const res = await request(app).get(`/artifact/${runId}/${itemPath}`);
    expect(res.statusCode).toBe(404);
  });
});
