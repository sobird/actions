import { vi } from 'vitest';

/**
 * simple-git 的部分 mock：只把身份注入到每次 `simpleGit(...)` 调用，其余导出保持真实。
 *
 * 给测试里的每次 git 提交一个固定身份，别让它去翻开发机的 `~/.gitconfig`。有全局配置的
 * 机器上 `git commit` 顺带就有了作者，CI runner 上没有，会以「Author identity unknown」
 * 整片失败。以前是把 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 设进环境变量让子进程继承，但
 * simple-git 4 起默认带一个环境守卫，会把 `GIT_` 前缀的变量从子进程里删掉（显式传进
 * options.env 更是直接抛错），环境变量这条路断了。
 *
 * 这里改成给每个 git 实例注入 `-c user.name/user.email`：命令行配置同样不经过环境守卫，
 * 又省得每个测试仓库都自己写一遍 config。在 `test/setup.ts` 里 `vi.mock('simple-git')`
 * 挂上，全测试只此一处。
 */
const actual = await vi.importActual<typeof import('simple-git')>('simple-git');

// `simpleGit` 由下面本地导出覆盖，`export *` 不会重复导出它
export * from 'simple-git';

export const simpleGit = ((baseDir?: string, options?: { config?: string[] }) =>
  actual.simpleGit(baseDir, {
    ...options,
    config: ['user.name=actions-test', 'user.email=actions-test@example.com', ...(options?.config ?? [])],
  })) as typeof actual.simpleGit;
