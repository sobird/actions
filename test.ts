import cp from 'node:child_process';

import yaml from 'yaml';

const buffer = cp.execSync('docker info');
const info = buffer.toString();

function parseDockerInfo(infoText) {
  const infoObject = {};
  const lines = infoText.trim().split('\n');

  const last = null;
  lines.forEach((line) => {
    // 忽略空行
    if (!line) return;

    console.log('line', line);

    const [key, value = ''] = line.split(':');
    const ks = key.trimEnd();
    const trimmedKey = key.trim();
    const level = ks.length - trimmedKey.length;
    console.log(trimmedKey, level);
    const trimmedValue = value.trim();

    // 检查值是否是嵌套结构的开始
    if (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) {
      // 将字符串解析为 JSON 对象
      infoObject[trimmedKey] = JSON.parse(trimmedValue);
    } else {
      infoObject[trimmedKey] = trimmedValue;
    }
  });

  return infoObject;
}

console.log('info', parseDockerInfo(info));
