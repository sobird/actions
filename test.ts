import crypto from 'crypto';

import { createSafeName } from './utils';

function createContainerName(...parts) {
  let name = parts.join('-');
  name = name.replace(/[^a-zA-Z0-9]/g, '-'); // 替换非字母数字字符为'-'
  name = name.replace(/--+/g, '-'); // 替换连续的'--'为单个'-'
  const hash = crypto.createHash('sha256').update(name).digest('hex');

  // SHA256 是64个十六进制字符。所以截断名称为62个字符以便添加哈希和分隔符
  const maxLength = 62; // 63个字符减去1个分隔符
  const trimmedName = trimToLen(name, 63); // 减去hash长度和分隔符长度

  return `${trimmedName}-${hash}`;
}

function trimToLen(s, l) {
  if (l < 0) {
    l = 0;
  }
  if (s.length > l) {
    return s.substring(0, l);
  }
  return s;
}

// 使用示例
const containerName = createContainerName('-my', 'container', 'name', 'with space');
console.log(containerName, createSafeName('-my', 'container', 'name', 'with space'));
