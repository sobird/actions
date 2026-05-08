export function createSafeName(...parts: string[]) {
  return parts
    .join('-') // 先合并
    .split(/[^a-zA-Z0-9]+/g) // 直接按非字母数字字符切开
    .filter(Boolean) // 过滤掉空字符串（这步天然去掉了首尾和连续多余的减号）
    .join('-');
}
