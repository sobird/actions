import fs from 'fs';
import path from 'path';

// 模拟 ParsePattern 函数，你需要根据你的具体逻辑来实现
function ParsePattern(pattern) {
  // 根据模式创建和返回一个Pattern对象或正则表达式
  return new RegExp(pattern, 'i');
}

function convertPatternToRegex(pattern) {
  // 转义所有可能的特殊字符，除了星号（*）和问号（?）
  let regex = pattern.replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1');
  // 将星号（*）转换为匹配任意非斜杠字符的序列
  regex = regex.replace(/\*+/g, (match) => {
    return match.length > 1 ? '.*' : '[^/]';
  });
  // 由于我们是从文件路径中测试，因此添加开头和结尾的锚点
  return new RegExp(`^${regex}$`);
}

// 读取特定的 .gitignore 文件
function readIgnoreFile(filePath) {
  const patterns = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const s = line.trim();
      if (s && !s.startsWith('#')) {
        patterns.push(convertPatternToRegex(s));
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') { // 如果错误不是 "文件不存在"，则抛出
      throw err;
    }
  }
  return patterns;
}

// 读取 .git/info/exclude 和递归地读取目录结构中的 .gitignore 文件
function ReadPatterns(dirPath) {
  const infoExcludeFile = '.git/info/exclude';
  const gitignoreFile = '.gitignore';
  const gitDir = '.git';

  let patterns = readIgnoreFile(path.join(dirPath, infoExcludeFile));
  patterns = patterns.concat(readIgnoreFile(path.join(dirPath, gitignoreFile)));

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name !== gitDir) {
      const subPatterns = ReadPatterns(path.join(dirPath, item.name));
      patterns = patterns.concat(subPatterns);
    }
  }

  return patterns;
}

// 使用示例
(async () => {
  try {
    const patterns = ReadPatterns('./');
    console.log(patterns); // 输出解析后的模式数组
  } catch (err) {
    console.error('Error reading patterns:', err);
  }
})();
