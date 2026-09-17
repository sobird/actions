import os from 'node:os';
import path from 'node:path';

import Executor from '@/common/executor';
import Git from '@/common/git';
import type Runner from '@/runner';

import Uses from '.';

const SERVER_URL = 'https://gitea.com';
const REPOSITORY = 'sobird/actions-test';
const SHA = '115f40b9fca317e4b0fec9af66b35d7a37ee69f8';
const TOKEN = 'the-runner-token';
const ACTION_CACHE_DIR = path.join(os.tmpdir(), 'actions-uses-test');
const LOCAL_WORKFLOW = './test/workflows/workflow_call/inputs.yml';
const REMOTE_WORKFLOW = 'sobird/actions-test/test/workflows/workflow_call/inputs.yml@master';
const REPOSITORY_DIR = path.join(ACTION_CACHE_DIR, 'gitea.com', REPOSITORY, 'master');

/** 什么都不做的执行器：替换掉真实执行，只断言 `Uses.executor` 选了哪条路、传了什么参数。 */
function noopExecutor() {
  return new Executor(async () => {});
}

/** 只喂 `Uses.executor` 真正会读的那几个字段，避免真去起一个 Runner。 */
function createRunner(config: { skipCheckout?: boolean; actionCache?: unknown } = {}) {
  return {
    Token: TOKEN,
    ActionCacheDir: ACTION_CACHE_DIR,
    config: { skipCheckout: false, actionCache: undefined, ...config },
    context: {
      github: {
        repository: REPOSITORY,
        sha: SHA,
        server_url: SERVER_URL,
      },
    },
  } as unknown as Runner;
}

describe('Uses.executor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has no executor for references that are not reusable workflows', () => {
    expect(new Uses('actions/checkout@v4').executor(createRunner())).toBeUndefined();
    expect(new Uses('docker://alpine:latest').executor(createRunner())).toBeUndefined();
  });

  it("requires an '@ref' on a remote reference", () => {
    expect(() => new Uses('sobird/actions-test/test/workflows/workflow_call/inputs.yml')).toThrow(/include an '@'/);
  });

  it('runs a local workflow in place when checkout is skipped', () => {
    const sentinel = noopExecutor();
    const local = vi.spyOn(Uses, 'ReusableWorkflowExecutor').mockReturnValue(sentinel);
    const clone = vi.spyOn(Git, 'CloneExecutor');

    expect(new Uses(LOCAL_WORKFLOW).executor(createRunner({ skipCheckout: true }))).toBe(sentinel);
    // 工作区里那份文件属于 caller 当前 checkout 的那个提交
    expect(local).toHaveBeenCalledWith(LOCAL_WORKFLOW, SHA);
    expect(clone).not.toHaveBeenCalled();
  });

  it('clones the current repository for a local workflow when checkout is not skipped', () => {
    const clone = vi.spyOn(Git, 'CloneExecutor').mockReturnValue(noopExecutor());

    new Uses(LOCAL_WORKFLOW).executor(createRunner());

    // 本地 workflow 也要从当前仓库的当前 sha 里取，而不是工作区里那份可能过期的文件
    expect(clone).toHaveBeenCalledWith(
      path.join(ACTION_CACHE_DIR, 'gitea.com', REPOSITORY, SHA),
      `${SERVER_URL}/${REPOSITORY}`,
      SHA,
      TOKEN,
    );
  });

  it('clones a remote workflow and resolves its path and commit inside the clone', async () => {
    const clone = vi.spyOn(Git, 'CloneExecutor').mockReturnValue(noopExecutor());
    const revision = vi.spyOn(Git, 'Revision').mockResolvedValue(SHA);
    const local = vi.spyOn(Uses, 'ReusableWorkflowExecutor').mockReturnValue(noopExecutor());

    new Uses(REMOTE_WORKFLOW).executor(createRunner());

    expect(clone).toHaveBeenCalledWith(REPOSITORY_DIR, `${SERVER_URL}/${REPOSITORY}`, 'master', TOKEN);
    expect(local).toHaveBeenCalledWith(
      path.join(REPOSITORY_DIR, 'test/workflows/workflow_call/inputs.yml'),
      expect.any(Function),
    );

    // 被调 workflow 的 sha 是克隆目录的 HEAD：要等 clone 完才解析得出，所以是个 thunk
    const resolveSha = local.mock.calls[0]?.[1] as () => Promise<string | undefined>;
    expect(await resolveSha()).toBe(SHA);
    expect(revision).toHaveBeenCalledWith(REPOSITORY_DIR);
  });

  it('shards the clone directory by host', () => {
    const clone = vi.spyOn(Git, 'CloneExecutor').mockReturnValue(noopExecutor());

    new Uses(REMOTE_WORKFLOW).executor(createRunner());
    new Uses(`https://github.com/${REMOTE_WORKFLOW}`).executor(createRunner());

    // 同一个 owner/repo 在 gitea.com 和 github.com 上是两份内容，目录不能互相顶掉
    expect(clone.mock.calls.map(([dir]) => dir)).toEqual([
      REPOSITORY_DIR,
      path.join(ACTION_CACHE_DIR, 'github.com', REPOSITORY, 'master'),
    ]);
  });

  it('fetches a remote workflow through the action cache when one is configured', () => {
    const sentinel = noopExecutor();
    const fromCache = vi.spyOn(Uses, 'ActionCacheReusableWorkflowExecutor').mockReturnValue(sentinel);
    const clone = vi.spyOn(Git, 'CloneExecutor');

    expect(new Uses(REMOTE_WORKFLOW).executor(createRunner({ actionCache: {} }))).toBe(sentinel);
    expect(fromCache).toHaveBeenCalled();
    expect(clone).not.toHaveBeenCalled();
  });

  it('uses the action cache for the current repository when a local workflow is not checked out', () => {
    const fromCache = vi.spyOn(Uses, 'ActionCacheReusableWorkflowExecutor').mockReturnValue(noopExecutor());
    const clone = vi.spyOn(Git, 'CloneExecutor');

    const reusable = new Uses(LOCAL_WORKFLOW);
    reusable.executor(createRunner({ actionCache: {} }));

    // 缓存里取的是 caller 的仓库和当前 sha，而不是 uses 里那串相对路径
    expect(reusable.repository).toBe(REPOSITORY);
    expect(reusable.ref).toBe(SHA);
    expect(fromCache).toHaveBeenCalledWith(reusable);
    expect(clone).not.toHaveBeenCalled();
  });
});
