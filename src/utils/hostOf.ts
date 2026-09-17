import { createSafeName } from './createSafeName';

/**
 * 把仓库地址收敛成一段可以当目录名的 host：URL 取主机（不含凭据，端口保留），
 * 本地路径折叠成一段。缓存目录按它分片，好让同一个 owner/repo 在 GHE 和 github.com
 * 上共存，而不是互相顶掉。
 */
export function hostOf(url: string) {
  try {
    const { host } = new URL(url);
    if (host) {
      return host;
    }
  } catch {
    // 离线镜像和测试夹具传的是本地路径，不是 URL
  }

  return createSafeName(url) || 'local';
}
