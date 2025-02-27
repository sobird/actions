import quote, { ControlOperator } from 'shell-quote';

// 原始命令
const input = 'echo ${INPUT_SOMEKEY} | grep somevalue';

// 解析命令
const parsed = quote.parse(input, (name) => { return `\${${name}}`; }).map((part) => {
  if (typeof part === 'object' && (part as { op: ControlOperator }).op) {
    return (part as { op: ControlOperator }).op;
  }
  return part;
});

console.log('parsed', parsed);

// 将解析结果转换为 Docker CMD 可用的格式
const result = [];
let currentPart = '';

parsed.forEach((part) => {
  if (typeof part === 'object' && part.op) {
    // 如果是操作符，将当前部分添加到结果中，并重置 currentPart
    if (currentPart) {
      result.push(currentPart);
      currentPart = '';
    }
    result.push(part.op);
  } else {
    // 如果是字符串，拼接到 currentPart
    if (currentPart) {
      currentPart += ' ';
    }
    currentPart += part;
  }
});

// 添加最后一部分
if (currentPart) {
  result.push(currentPart);
}

// 输出 Docker CMD 格式
console.log(['sh', '-c', result.join(' ')]);
// 输出: ['sh', '-c', 'echo ${INPUT_SOMEKEY} | grep somevalue']
