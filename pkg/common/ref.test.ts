import Ref from './ref';

describe('Ref', () => {
  test('branch names (with and without slash)', () => {
    expect(new Ref('refs/heads/foo').branchName()).toBe('foo');
    expect(new Ref('refs/heads/feature/foo').branchName()).toBe('feature/foo');
  });

  test('tag names (with and without slash)', () => {
    expect(new Ref('refs/tags/foo').tagName()).toBe('foo');
    expect(new Ref('refs/tags/release/foo').tagName()).toBe('release/foo');
  });

  test('pull names', () => {
    expect(new Ref('refs/pull/1/head').pullName()).toBe('1');
    expect(new Ref('refs/pull/my/pull/head').pullName()).toBe('my/pull');
  });

  test('for branch names', () => {
    expect(new Ref('refs/for/main').forBranchName()).toBe('main');
    expect(new Ref('refs/for/my/branch').forBranchName()).toBe('my/branch');
  });

  test('commit hashes', () => {
    expect(new Ref('c0ffee').shortName()).toBe('c0ffee');
  });
});

describe('Ref.URL', () => {
  const repoURL = '/user/repo';

  test('branch', () => {
    expect(Ref.URL(repoURL, 'refs/heads/foo')).toBe(`${repoURL}/src/branch/foo`);
  });

  test('tag', () => {
    expect(Ref.URL(repoURL, 'refs/tags/foo')).toBe(`${repoURL}/src/tag/foo`);
  });

  test('commit', () => {
    expect(Ref.URL(repoURL, 'c0ffee')).toBe(`${repoURL}/src/commit/c0ffee`);
  });
});
