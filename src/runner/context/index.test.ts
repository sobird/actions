import githubFixture from '@/gen/__mocks__/data/context';

import Context from '.';
import { Github } from './github';
import Step from './step';

/** 跑者侧送来的上下文负载，只带 github 的一部分字段，其余由 Github 的默认值兜底 */
const github = githubFixture as unknown as Github;

function createContext(context: Partial<Context> = {}) {
  return new Context({ github, ...context } as Context);
}

describe('context construction', () => {
  it('keeps the github payload as given', () => {
    const { github: result } = createContext();

    expect(result).toBeInstanceOf(Github);
    expect(result.actor).toBe('sobird');
    expect(result.repository).toBe('sobird/actions-test');
    expect(result.ref).toBe('refs/heads/main');
    // 构造只做赋值，不推导 ref/ref_name：负载里没给的字段保持默认值
    expect(result.actor_id).toBe('');
  });

  it('copies the plain maps instead of referencing them', () => {
    const env: Record<string, string> = { FOO: 'bar' };
    const steps: Record<string, Step> = {
      first: { outputs: {}, outcome: 'success' as const, conclusion: 'success' as const },
    };
    const context = createContext({ env, steps });

    env.FOO = 'changed';
    delete steps.first;

    expect(context.env.FOO).toBe('bar');
    expect(context.steps.first).toBeDefined();
  });

  it('wraps the reusable workflow jobs and needs', () => {
    const context = createContext({
      jobs: { build: { result: 'failure', outputs: { id: '1' } } },
      needs: { build: { result: 'failure', outputs: { id: '1' } } },
    });

    expect(context.jobs.build.result).toBe('failure');
    expect(context.jobs.build.outputs).toEqual({ id: '1' });
    expect(context.needs.build.result).toBe('failure');
    expect(context.needs.build.outputs).toEqual({ id: '1' });
  });

  it('defaults the job to a successful status', () => {
    const context = createContext();

    expect(context.job.status).toBe('success');
    expect(context.job.services).toEqual({});
  });
});

describe('context clone', () => {
  it('rebuilds the sub-contexts instead of copying plain objects', () => {
    const context = createContext();

    const cloned = context.clone();

    expect(cloned).toBeInstanceOf(Context);
    expect(cloned).not.toBe(context);
    expect(cloned.github).toBeInstanceOf(Github);
    expect(cloned.github).not.toBe(context.github);
    expect(cloned.github.actor).toBe('sobird');
    expect(cloned.job).not.toBe(context.job);
  });

  it('keeps the clone independent of the original', () => {
    const context = createContext({ env: { FOO: 'bar' } });
    context.github.action = 'first';
    context.StepResult = { conclusion: 'failure' };

    const cloned = context.clone();
    cloned.github.action = 'second';
    cloned.env.FOO = 'changed';
    cloned.job.status = 'cancelled';

    expect(context.github.action).toBe('first');
    expect(context.env.FOO).toBe('bar');
    expect(context.job.status).toBe('failure');
    // structuredClone 深拷贝 steps，改克隆不会回流到原上下文
    expect(cloned.steps.first).toEqual({ conclusion: 'failure', outcome: 'success', outputs: {} });

    cloned.steps.first.outputs.id = '1';
    expect(context.steps.first.outputs).toEqual({});
  });
});

describe('context StepResult', () => {
  it('creates the step entry with success defaults', () => {
    const context = createContext();
    context.github.action = 'first';

    expect(context.StepResult).toBeUndefined();

    context.StepResult = {};

    expect(context.StepResult).toEqual({ conclusion: 'success', outcome: 'success', outputs: {} });
    expect(context.job.status).toBe('success');
  });

  it('merges into the entry of a step that already ran', () => {
    const context = createContext();
    context.github.action = 'first';

    context.StepResult = { outputs: { id: '1' } };
    context.StepResult = { conclusion: 'failure' };

    expect(context.StepResult).toEqual({ conclusion: 'failure', outcome: 'success', outputs: { id: '1' } });
    expect(context.job.status).toBe('failure');
  });

  it('leaves the job status alone for outcomes without a status', () => {
    const context = createContext();
    context.github.action = 'first';

    context.StepResult = { conclusion: 'skipped' };

    expect(context.job.status).toBe('success');
  });
});
