import { hostOf } from './hostOf';

describe('Test Utils hostOf', () => {
  it('takes the host out of a repository url', () => {
    expect(hostOf('https://gitea.com/sobird/actions-test')).toBe('gitea.com');
    expect(hostOf('https://token:s3cr3t@ghe.example.com:8443/owner/repo')).toBe('ghe.example.com:8443');
  });

  it('folds a local path into a single segment', () => {
    // 不能把整条路径当目录名，不同来源也必须落到不同目录里
    expect(hostOf('/tmp/actions-origin-abc123')).toBe('tmp-actions-origin-abc123');
    expect(hostOf('')).toBe('local');
  });
});
