import { generateGithubContext, type GithubContextSources } from './context';

type RunSource = NonNullable<GithubContextSources['run']>;
type JobSource = NonNullable<GithubContextSources['job']>;
type AttemptSource = NonNullable<GithubContextSources['attempt']>;
type WorkflowSource = NonNullable<GithubContextSources['workflow']>;

/** 只列 builder 要读的列，行里其余内容与它无关。 */
function run(overrides: Partial<RunSource> = {}): RunSource {
  return {
    id: 7,
    index: 3,
    ref: 'refs/heads/main',
    commitSha: 'abc123',
    eventName: 'workflow_dispatch',
    eventPayload: JSON.stringify({ workdir: '/checkout' }),
    ...overrides,
  } as RunSource;
}

function job(overrides: Partial<JobSource> = {}): JobSource {
  return { jobId: 'build', repositoryId: 4, attempt: 1, ...overrides } as JobSource;
}

describe('generateGithubContext', () => {
  it('derives ref_name and ref_type from the run ref', () => {
    const github = generateGithubContext({ run: run() });

    expect(github.ref).toBe('refs/heads/main');
    expect(github.ref_name).toBe('main');
    expect(github.ref_type).toBe('branch');
  });

  it('reads a tag ref as a tag', () => {
    const github = generateGithubContext({ run: run({ ref: 'refs/tags/v1' }) });

    expect(github.ref_name).toBe('v1');
    expect(github.ref_type).toBe('tag');
  });

  it('takes ref and sha from the run columns', () => {
    // 本地 event payload 只带 workdir，没有 push 事件那套 ref/after
    const github = generateGithubContext({ run: run() });

    expect(github).toMatchObject({
      event_name: 'workflow_dispatch',
      ref: 'refs/heads/main',
      sha: 'abc123',
      run_id: '7',
      run_number: '3',
      ref_protected: false,
      token: '',
    });
  });

  it('treats an unreadable event payload as empty', () => {
    const github = generateGithubContext({ run: run({ eventPayload: 'not json' }) });

    expect(github.event).toEqual({});
    expect(github.ref).toBe('refs/heads/main');
  });

  it('names the workflow, falling back to its file', () => {
    const named = { name: 'CI', file: 'ci.yml' } as WorkflowSource;
    const unnamed = { file: 'ci.yml' } as WorkflowSource;

    expect(generateGithubContext({ workflow: named }).workflow).toBe('CI');
    expect(generateGithubContext({ workflow: unnamed }).workflow).toBe('ci.yml');
  });

  it('carries the job when there is one, and an empty string when there is not', () => {
    expect(generateGithubContext({ run: run(), job: job() })).toMatchObject({ job: 'build', repository_id: '4' });
    expect(generateGithubContext({ run: run() }).job).toBe('');
  });

  it('prefers the attempt, then the job attempt, then 1', () => {
    const attempt = { attempt: 2 } as AttemptSource;

    expect(generateGithubContext({ run: run(), attempt }).run_attempt).toBe('2');
    expect(generateGithubContext({ run: run(), job: job({ attempt: 3 }) }).run_attempt).toBe('3');
    expect(generateGithubContext({ run: run() }).run_attempt).toBe('1');
  });

  it('leaves repository and repository_owner to the caller', () => {
    // 本仓库没有 repository / owner 表，这两个键由装配 Task 的一侧填
    expect(generateGithubContext({ run: run() })).toMatchObject({ repository: '', repository_owner: '' });
  });

  it('falls back to workflow_dispatch without a run', () => {
    const github = generateGithubContext({});

    expect(github).toMatchObject({ event_name: 'workflow_dispatch', run_id: '', run_number: '', run_attempt: '1' });
  });
});
