import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { Storage } from './storage'; // 假设你的文件名是 Storage.ts

describe('Storage', () => {
  let storage: Storage;
  let testDir: string;

  beforeEach(async () => {
    // 为每次测试创建一个独立的临时目录
    testDir = path.join(os.tmpdir(), `storage-test-${Math.random().toString(36).slice(2)}`);
    storage = new Storage(testDir);
  });

  afterEach(async () => {
    // 测试结束后清理物理文件
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // 辅助函数：将字符串转换为可读流
  const createMockReq = (content: string) => Readable.from(Buffer.from(content));

  describe('Initialization', () => {
    it('should create the root directory if it does not exist', () => {
      expect(existsSync(testDir)).toBe(true);
    });
  });

  describe('Workflow: Write and Commit', () => {
    it('should handle multipart upload and commit correctly', async () => {
      const id = 12345;
      const part1 = 'Hello ';
      const part2 = 'World!';
      const expectedSize = part1.length + part2.length;

      // 1. 写入分片
      await storage.write(id, 0, createMockReq(part1));
      await storage.write(id, part1.length, createMockReq(part2));

      // 2. 校验临时目录是否存在
      const tmpDir = path.join(testDir, 'tmp', id.toString());
      expect(existsSync(tmpDir)).toBe(true);

      // 3. 提交合并
      const actualSize = await storage.commit(id, expectedSize);

      // 4. 断言结果
      expect(actualSize).toBe(expectedSize);
      expect(storage.exist(id)).toBe(true);

      // 检查合并后的内容
      const finalPath = storage.getFinalPath(id);
      const content = await fs.readFile(finalPath, 'utf-8');
      expect(content).toBe('Hello World!');

      // 5. 校验临时目录是否已清理
      expect(existsSync(tmpDir)).toBe(false);
    });

    it('should throw error if committed size mismatches', async () => {
      const id = 999;
      await storage.write(id, 0, createMockReq('data'));

      // 预期大小为 100，实际只有 4
      await expect(storage.commit(id, 100)).rejects.toThrow('Size mismatch');

      // 校验校验失败后，残余文件是否被清理
      expect(storage.exist(id)).toBe(false);
    });
  });

  describe('Commit Error Handling', () => {
    it('should throw "No chunks found for ID:" when tmp directory does not exist', async () => {
      const id = 888;
      // 确保目录真的不存在
      await expect(storage.commit(id, 10)).rejects.toThrow(`No chunks found for ID: ${id}`);
    });

    it('should throw "No chunks found for ID:" when tmp directory is empty', async () => {
      const id = 999;
      const tmpDir = storage.tmpDir(id);

      // 手动创建一个空目录，但不写入任何分片
      await fs.mkdir(tmpDir, { recursive: true });

      await expect(storage.commit(id, 10)).rejects.toThrow(`No chunks found for ID: ${id}`);

      // 清理创建的空目录
      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });

  describe('Remove and Serve', () => {
    it('should remove both final file and tmp directory', async () => {
      const id = 777;
      await storage.write(id, 0, createMockReq('temp'));
      await storage.commit(id, 4);

      await storage.remove(id);
      expect(storage.exist(id)).toBe(false);
    });

    it('should correctly serve the file as a stream', async () => {
      const id = 111;
      const content = 'Stream Content';
      await storage.write(id, 0, createMockReq(content));
      await storage.commit(id, content.length);

      expect(storage.getReadStream(id).pipe).toBeDefined();
    });
  });

  describe('Path Logic (Private Methods)', () => {
    it('should generate correct partitioned paths', () => {
      const id = 256; // 256 % 255 = 1 (16进制为 01)
      const finalPath = storage.getFinalPath(id);

      // 验证是否包含分层目录
      const partition = (id % 0xff).toString(16).padStart(2, '0').toUpperCase();
      expect(finalPath).toContain(path.join(testDir, partition, id.toString()));
    });

    it('should generate correctly padded chunk names', () => {
      const offset = 4096; // 16进制为 1000
      const chunkPath = storage.getChunkPath(1, offset);

      // 验证补位: 0000000000001000
      expect(path.basename(chunkPath)).toBe('0000000000001000');
    });
  });
});
