// 预定义正则，避免在循环中重复创建
const NON_ALPHANUM_PATTERN = /[^a-zA-Z0-9-]+/g;
const CONSECUTIVE_DASH_PATTERN = /-{2,}/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

export function createSafeName(...parts: string[]) {
  const name = parts
    .map((part) => {
      if (typeof part !== 'string') return '';

      return part
        .replace(NON_ALPHANUM_PATTERN, '-') // 非法字符变减号
        .replace(CONSECUTIVE_DASH_PATTERN, '-') // 多个减号变一个（修复 ReDoS）
        .replace(TRIM_DASH_PATTERN, ''); // 去掉首尾减号
    })
    .filter(Boolean);
  return name.join('-');
}
