import fs from 'fs';

// 创建一个 Generator 函数来读取流
function* readStream(stream) {
  yield new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      resolve(chunk.toString()); // 将每个数据块作为字符串 yield 出来
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('end', () => {
      resolve(); // 当流结束时，解决 Promise
    });
  });
}

// 使用 Generator 函数
async function processStream(filePath) {
  const readStreamGenerator = readStream(fs.createReadStream(filePath, 'utf8'));

  const result = await readStreamGenerator.next().value;
  console.log('result', result);
}

await processStream('package.json');
