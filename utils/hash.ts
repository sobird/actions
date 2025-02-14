import crypto from 'node:crypto';

export function createSha1Hash(content: string = '') {
  // 创建 SHA-1 哈希
  const hash = crypto.createHash('sha1');
  hash.update(content);

  return hash.digest('hex');
}
