/**
 * The top-level context available during any job or step in a workflow.
 *
 * The github context contains information about the workflow run and the event that triggered the run.
 * You can also read most of the github context data in environment variables. For more information about environment variables, see "{@link https://docs.github.com/en/actions/learn-github-actions/variables Variables}."
 *
 * Warning: When using the whole github context, be mindful that it includes sensitive information such as github.token.
 * GitHub masks secrets when they are printed to the console, but you should be cautious when exporting or printing the context.
 *
 * Warning: When creating workflows and actions, you should always consider whether your code might execute untrusted input from possible attackers.
 * Certain contexts should be treated as untrusted input, as an attacker could insert their own malicious content. For more information, see "{@link https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#understanding-the-risk-of-script-injections Security hardening for GitHub Actions}."
 */
export class Github {
  /**
   * The name of the action currently running, or the id of a step.
   *
   * GitHub removes special characters, and uses the name __run when the current step runs a script without an id.
   * If you use the same action more than once in the same job, the name will include a suffix with the sequence number with underscore before it.
   * For example, the first script you run will have the name __run, and the second script will be named __run_2. Similarly,
   * the second invocation of actions/checkout will be actionscheckout2.
   *
   * @alias GITHUB_ACTION
   */
  action: string = '';

  /**
   * The path where an action is located. This property is only supported in composite actions.
   *
   * You can use this path to access files located in the same repository as the action, for example by changing directories to the path: cd ${{ github.action_path }} .
   *
   * @alias GITHUB_ACTION_PATH
   */
  action_path: string = '';

  /**
   * For a step executing an action, this is the ref of the action being executed. For example, v2.
   *
   * Do not use in the run keyword.
   * To make this context work with composite actions, reference it within the env context of the composite action.
   */
  action_ref: string = '';

  /**
   * For a step executing an action, this is the owner and repository name of the action.
   * For example, actions/checkout.
   *
   * Do not use in the run keyword.
   * To make this context work with composite actions, reference it within the env context of the composite action.
   *
   * @alias GITHUB_ACTION_REPOSITORY
   */
  action_repository: string = '';

  /**
   * For a composite action, the current result of the composite action.
   */
  action_status: string = '';

  /**
   * The username of the user that triggered the initial workflow run.
   *
   * If the workflow run is a re-run, this value may differ from github.triggering_actor.
   * Any workflow re-runs will use the privileges of github.actor,
   * even if the actor initiating the re-run (github.triggering_actor) has different privileges.
   *
   * @alias GITHUB_ACTOR
   */
  actor: string = '';

  /**
   * The account ID of the person or app that triggered the initial workflow run. For example, 1234567.
   *
   * Note that this is different from the actor username.
   *
   * @alias GITHUB_ACTOR_ID
   */
  actor_id: string = '';

  /**
   * The URL of the GitHub REST API.
   *
   * @alias GITHUB_API_URL
   */
  api_url: string = '';

  /**
   * The base_ref or target branch of the pull request in a workflow run.
   *
   * This property is only available when the event that triggers a workflow run is either pull_request or pull_request_target.
   *
   * @alias GITHUB_BASE_REF
   */
  base_ref: string = '';

  /**
   * Path on the runner to the file that sets environment variables from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable Workflow commands for GitHub Actions}."
   *
   * @alias GITHUB_ENV
   */
  env: string = '';

  /**
   * The full event webhook payload.
   *
   * You can access individual properties of the event using this context.
   * This object is identical to the webhook payload of the event that triggered the workflow run, and is different for each event.
   * The webhooks for each GitHub Actions event is linked in "{@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows Events that trigger workflows}."
   * For example, for a workflow run triggered by the {@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push `push` event}, this object contains the contents of the {@link https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads#push push webhook payload}.
   */
  event: Record<string, any> = {};

  /**
   * The name of the event that triggered the workflow run.
   *
   * @alias GITHUB_EVENT_NAME
   */
  event_name: string = '';

  /**
   * The path to the file on the runner that contains the full event webhook payload.
   *
   * @alias GITHUB_EVENT_PATH
   */
  event_path: string = '';

  /**
   * The URL of the GitHub GraphQL API.
   *
   * @alias GITHUB_GRAPHQL_URL
   */
  graphql_url: string = '';

  /**
   * The head_ref or source branch of the pull request in a workflow run.
   *
   * This property is only available when the event that triggers a workflow run is either pull_request or pull_request_target.
   *
   * @alias GITHUB_HEAD_REF
   */
  head_ref: string = '';

  /**
   * The {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id `job_id`} of the current job.
   *
   * Note: This context property is set by the Actions runner, and is only available within the execution steps of a job.
   * Otherwise, the value of this property will be null.
   *
   * @alias GITHUB_JOB
   */
  job: string = '';

  /**
   * Path on the runner to the file that set output from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   *
   * @alias GITHUB_OUTPUT
   */
  output: string = '';

  /**
   * Path on the runner to the file that sets system PATH variables from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-system-path Workflow commands for GitHub Actions}."
   *
   * @alias GITHUB_PATH
   */
  path: string = '';

  /**
   * The fully-formed ref of the branch or tag that triggered the workflow run.
   *
   * For workflows triggered by `push`, this is the branch or tag ref that was pushed.
   * For workflows triggered by `pull_request`, this is the pull request merge branch.
   * For workflows triggered by `release`, this is the release tag created.
   * For other triggers, this is the branch or tag ref that triggered the workflow run.
   * This is only set if a branch or tag is available for the event type.
   * The ref given is fully-formed, meaning that for branches the format is `refs/heads/<branch_name>`, for pull requests it is `refs/pull/<pr_number>/merge`, and for tags it is `refs/tags/<tag_name>`.
   * For example, `refs/heads/feature-branch-1`.
   *
   * @alias GITHUB_REF
   */
  ref: string = '';

  /**
   * The short ref name of the branch or tag that triggered the workflow run.
   * This value matches the branch or tag name shown on GitHub.
   * For example, `feature-branch-1`.
   *
   * For pull requests, the format is `<pr_number>/merge`.
   *
   * @alias GITHUB_REF_NAME
   */
  ref_name: string = '';

  /**
   * `true` if branch protections or {@link https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository rulesets} are configured for the ref that triggered the workflow run.
   *
   * @alias GITHUB_REF_PROTECTED
   */
  ref_protected: boolean = false;

  /**
   * The type of ref that triggered the workflow run. Valid values are `branch` or `tag`.
   *
   * @alias GITHUB_REF_TYPE
   */
  ref_type: 'branch' | 'tag' | '' = '';

  /**
   * The owner and repository name. For example, `octocat/Hello-World`.
   *
   * @alias GITHUB_REPOSITORY
   */
  repository: string = '';

  /**
   * The ID of the repository. For example, `123456789`. Note that this is different from the repository name.
   *
   * @alias GITHUB_REPOSITORY_ID
   */
  repository_id: string = '';

  /**
   * The repository owner's username. For example, `octocat`.
   *
   * @alias GITHUB_REPOSITORY_OWNER
   */
  repository_owner: string = '';

  /**
   * The repository owner's account ID. For example, `1234567`.
   * Note that this is different from the owner's name.
   *
   * @alias GITHUB_REPOSITORY_OWNER_ID
   */
  repository_owner_id: string = '';

  /**
   * The Git URL to the repository. For example, `git://github.com/octocat/hello-world.git`.
   */
  repositoryUrl: string = '';

  /**
   * The number of days that workflow run logs and artifacts are kept.
   *
   * @alias GITHUB_RETENTION_DAYS
   */
  retention_days: string = '';

  /**
   * A unique number for each workflow run within a repository.
   * This number does not change if you re-run the workflow run.
   *
   * @alias GITHUB_RUN_ID
   */
  run_id: string = '';

  /**
   * A unique number for each run of a particular workflow in a repository.
   * This number begins at 1 for the workflow's first run, and increments with each new run.
   * This number does not change if you re-run the workflow run.
   *
   * @alias GITHUB_RUN_NUMBER
   */
  run_number: string = '';

  /**
   * A unique number for each attempt of a particular workflow run in a repository.
   * This number begins at 1 for the workflow run's first attempt, and increments with each re-run.
   *
   * @alias GITHUB_RUN_ATTEMPT
   */
  run_attempt: string = '';

  /**
   * The source of a secret used in a workflow. Possible values are `None`, `Actions`, `Codespaces`, or `Dependabot`.
   */
  secret_source: 'None' | 'Actions' | 'Codespaces' | 'Dependabot' = 'Actions';

  /**
   * The URL of the GitHub server. For example: `https://github.com`.
   *
   * @alias GITHUB_SERVER_URL
   */
  server_url: string = 'https://github.com';

  /**
   * The commit SHA that triggered the workflow.
   *
   * The value of this commit SHA depends on the event that triggered the workflow.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows Events that trigger workflows}."
   * For example, `ffac537e6cbbf934b08745a378932722df287a53`.
   *
   * @alias GITHUB_SHA
   */
  sha: string = '';

  /**
   * Path on the runner to the file that save state from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   *
   * @alias GITHUB_STATE
   */
  state: string = '';

  /**
   * Path on the runner to the file that create step summary from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   *
   * ```sh
   * echo "{markdown content}" >> $GITHUB_STEP_SUMMARY
   *
   * echo "### Hello world! :rocket:" >> $GITHUB_STEP_SUMMARY
   * ```
   *
   * @alias GITHUB_STEP_SUMMARY
   */
  step_summary: string = '';

  /**
   * A token to authenticate on behalf of the GitHub App installed on your repository.
   * This is functionally equivalent to the GITHUB_TOKEN secret.
   * For more information, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication Automatic token authentication}."
   *
   * Note: This context property is set by the Actions runner, and is only available within the execution steps of a job.
   * Otherwise, the value of this property will be null.
   */
  token: string = '';

  /**
   * The username of the user that initiated the workflow run.
   *
   * If the workflow run is a re-run, this value may differ from `github.actor`.
   * Any workflow re-runs will use the privileges of `github.actor`, even if the actor initiating the re-run (`github.triggering_actor`) has different privileges.
   *
   * @alias GITHUB_TRIGGERING_ACTOR
   */
  triggering_actor: string = '';

  /**
   * The name of the workflow.
   *
   * If the workflow file doesn't specify a name, the value of this property is the full path of the workflow file in the repository.
   *
   * @alias GITHUB_WORKFLOW
   */
  workflow: string = '';

  /**
   * The ref path to the workflow.
   *
   * For example, `octocat/hello-world/.github/workflows/my-workflow.yml@refs/heads/my_branch`.
   *
   * @alias GITHUB_WORKFLOW_REF
   */
  workflow_ref: string = '';

  /**
   * The commit SHA for the workflow file.
   *
   * @alias GITHUB_WORKFLOW_SHA
   */
  workflow_sha: string = '';

  /**
   * The default working directory on the runner for steps, and the default location of your repository when using the {@link https://github.com/actions/checkout checkout} action.
   *
   * @alias GITHUB_WORKSPACE
   */
  workspace: string = '';

  constructor(github: Partial<Github>) {
    Object.assign(this, github);

    // this.setBaseAndHeadRef();
    // this.setRef(github.ref || '');
    // this.setRefTypeAndName();
    // this.setSha(github.sha || '');
    // this.setRepository();
  }

  setBaseAndHeadRef() {
    if (this.event_name === 'pull_request' || this.event_name === 'pull_request_target') {
      this.base_ref = this.base_ref || this.event?.pull_request?.base?.ref || '';
      this.head_ref = this.head_ref || this.event?.pull_request?.head?.ref || '';
    }
  }

  setRef(ref: string) {
    switch (this.event_name) {
      case 'pull_request_target':
        this.ref = `refs/heads/${this.base_ref}`;
        break;
      case 'pull_request':
      case 'pull_request_review':
      case 'pull_request_review_comment':
        this.ref = `refs/pull/${this.event.number}/merge`;
        break;
      case 'deployment':
      case 'deployment_status':
        this.ref = this.event?.deployment?.ref;
        break;
      case 'release':
        this.ref = `refs/tags/${this.event?.release?.tag_name}`;
        break;
      case 'push':
      case 'create':
      case 'workflow_dispatch':
        this.ref = this.event?.ref;
        break;
      default: {
        this.ref = `refs/heads/${this.event?.repository?.default_branch}`;
        break;
      }
    }

    this.ref = this.ref || ref;
  }

  setRefTypeAndName() {
    let refType: Github['ref_type'] = '';
    let refName = '';

    if (this.ref.startsWith('refs/tags/')) {
      refType = 'tag';
      refName = this.ref.substring('refs/tags/'.length);
    } else if (this.ref.startsWith('refs/heads/')) {
      refType = 'branch';
      refName = this.ref.substring('refs/heads/'.length);
    } else if (this.ref.startsWith('refs/pull/')) {
      // refType = 'pull';
      refName = this.ref.substring('refs/pull/'.length);
    }

    this.ref_type = this.ref_type || refType;
    this.ref_name = this.ref_name || refName;
  }

  setSha(sha: string) {
    switch (this.event_name) {
      case 'pull_request_target':
        this.sha = this.event?.pull_request?.base?.sha;
        break;
      case 'deployment':
      case 'deployment_status':
        this.sha = this.event?.deployment?.sha;
        break;
      case 'push':
      case 'create':
      case 'workflow_dispatch': {
        const deleted = this.event?.deleted === undefined ? false : this.event.deleted;
        if (!deleted) {
          this.sha = this.event?.after;
        }
        break;
      }
      default:
        break;
    }

    this.sha = this.sha || sha;
  }

  setRepository() {
    this.repository = this.event.repository?.full_name || this.repository || '';
    this.repository_id = this.event.repository?.id || this.repository_id || '';
    this.repository_owner = this.event.repository?.owner?.username || this.repository_owner || '';
    this.repository_owner_id = this.event.repository?.owner?.id || this.repository_owner_id || '';
    this.repositoryUrl = this.event.repository?.clone_url || '';
  }

  get Env() {
    const env: Record<string, unknown> = {};
    env.CI = true;
    env.GITHUB_ACTION = this.action;
    env.GITHUB_ACTION_PATH = this.action_path;
    env.GITHUB_ACTION_REPOSITORY = this.action_repository;
    env.GITHUB_ACTION_REF = this.action_ref;
    env.GITHUB_ACTIONS = true;
    env.GITHUB_ACTOR = this.actor;
    env.GITHUB_ACTOR_ID = this.actor_id;
    env.GITHUB_API_URL = this.api_url;
    env.GITHUB_BASE_REF = this.base_ref;
    env.GITHUB_ENV = this.env;
    env.GITHUB_EVENT_NAME = this.event_name;
    env.GITHUB_EVENT_PATH = this.event_path;
    env.GITHUB_GRAPHQL_URL = this.graphql_url;
    env.GITHUB_HEAD_REF = this.head_ref;
    env.GITHUB_JOB = this.job;
    env.GITHUB_PATH = this.path;
    env.GITHUB_REF = this.ref;
    env.GITHUB_REF_NAME = this.ref_name;
    env.GITHUB_REF_TYPE = this.ref_type;
    env.GITHUB_REF_PROTECTED = this.ref_protected;
    env.GITHUB_REPOSITORY = this.repository;
    env.GITHUB_REPOSITORY_ID = this.repository_id;
    env.GITHUB_REPOSITORY_OWNER = this.repository_owner;
    env.GITHUB_REPOSITORY_OWNER_ID = this.repository_owner_id;
    env.GITHUB_RETENTION_DAYS = this.retention_days;
    env.GITHUB_RUN_ATTEMPT = this.run_attempt;
    env.GITHUB_RUN_ID = this.run_id;
    env.GITHUB_RUN_NUMBER = this.run_number;
    env.GITHUB_SERVER_URL = this.server_url;
    env.GITHUB_SHA = this.sha;
    env.GITHUB_TRIGGERING_ACTOR = this.triggering_actor;
    env.GITHUB_WORKFLOW = this.workflow;
    env.GITHUB_WORKFLOW_REF = this.workflow_ref;
    env.GITHUB_WORKFLOW_SHA = this.workflow_sha;
    env.GITHUB_WORKSPACE = this.workspace;
    env.GITHUB_TOKEN = this.token;

    env.GITHUB_OUTPUT = this.output;
    env.GITHUB_STATE = this.state;
    env.GITHUB_STEP_SUMMARY = this.step_summary;
    return env;
  }
}
