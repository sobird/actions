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

  constructor(init?: Partial<GithubContext>) {
    if (init) {
      Object.assign(this, init);
    }
  }

  // 类的其他方法...
}

export default GithubContext;
