/**
 * github context
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
 * @see https://github.com/actions/runner/blob/main/src/Runner.Worker/GitHubContext.cs
 *
 * sobird<i@sobird.me> at 2024/05/07 19:42:02 created.
 */

class GithubContext {
  event: { [key: string]: any };

  eventPath: string;

  workflow: string;

  runId: string;

  runNumber: string;

  actor: string;

  repository: string;

  eventName: string;

  sha: string;

  ref: string;

  refName: string;

  refType: string;

  headRef: string;

  baseRef: string;

  token: string;

  workspace: string;

  action: string;

  actionPath: string;

  actionRef: string;

  actionRepository: string;

  job: string;

  jobName: string;

  repositoryOwner: string;

  retentionDays: string;

  runnerPerflog: string;

  runnerTrackingID: string;

  serverURL: string;

  APIURL: string;

  GraphQLURL: string;

  constructor(init: Partial<GithubContext>) {
    this.event = { ddd: 'ddd' };
    Object.assign(this, init);
  }
}

export default GithubContext;

interface NestedMap {
  [key: string]: NestedMap | any;
}

export function nestedMapLookup(m: NestedMap, ...keys: string[]): any {
  if (keys.length === 0) {
    return undefined; // 或者抛出错误
  }

  const firstKey = keys[0];
  const value = m[firstKey];

  if (value === undefined) {
    return undefined;
  } if (keys.length === 1) {
    return value;
  }
  return nestedMapLookup(value as NestedMap, ...keys.slice(1));
}
