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
   */
  action: string;

  /**
   * The path where an action is located. This property is only supported in composite actions.
   *
   * You can use this path to access files located in the same repository as the action, for example by changing directories to the path: cd ${{ github.action_path }} .
   */
  action_path: string;

  /**
   * For a step executing an action, this is the ref of the action being executed. For example, v2.
   *
   * Do not use in the run keyword.
   * To make this context work with composite actions, reference it within the env context of the composite action.
   */
  action_ref: string;

  /**
   * For a step executing an action, this is the owner and repository name of the action. For example, actions/checkout.
   *
   * Do not use in the run keyword.
   * To make this context work with composite actions, reference it within the env context of the composite action.
   */
  action_repository: string;

  /**
   * For a composite action, the current result of the composite action.
   */
  action_status: string;

  /**
   * The username of the user that triggered the initial workflow run.
   *
   * If the workflow run is a re-run, this value may differ from github.triggering_actor.
   * Any workflow re-runs will use the privileges of github.actor,
   * even if the actor initiating the re-run (github.triggering_actor) has different privileges.
   */
  actor: string;

  /**
   * The account ID of the person or app that triggered the initial workflow run. For example, 1234567.
   *
   * Note that this is different from the actor username.
   */
  actor_id: string;

  /**
   * The URL of the GitHub REST API.
   */
  api_url: string;

  /**
   * The base_ref or target branch of the pull request in a workflow run.
   *
   * This property is only available when the event that triggers a workflow run is either pull_request or pull_request_target.
   */
  base_ref: string;

  /**
   * Path on the runner to the file that sets environment variables from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable Workflow commands for GitHub Actions}."
   */
  env: string;

  /**
   * The full event webhook payload.
   *
   * You can access individual properties of the event using this context.
   * This object is identical to the webhook payload of the event that triggered the workflow run, and is different for each event.
   * The webhooks for each GitHub Actions event is linked in "{@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows Events that trigger workflows}."
   * For example, for a workflow run triggered by the {@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push `push` event}, this object contains the contents of the {@link https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads#push push webhook payload}.
   */
  event: Record<string, any>;

  /**
   * The name of the event that triggered the workflow run.
   */
  event_name: string;

  /**
   * The path to the file on the runner that contains the full event webhook payload.
   */
  event_path: string;

  /**
   * The URL of the GitHub GraphQL API.
   */
  graphql_url: string;

  /**
   * The head_ref or source branch of the pull request in a workflow run.
   *
   * This property is only available when the event that triggers a workflow run is either pull_request or pull_request_target.
   */
  head_ref: string;

  /**
   * The {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id `job_id`} of the current job.
   *
   * Note: This context property is set by the Actions runner, and is only available within the execution steps of a job. Otherwise, the value of this property will be null.
   */
  job: string;

  /**
   * Path on the runner to the file that sets system PATH variables from workflow commands.
   *
   * This file is unique to the current step and is a different file for each step in a job.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-system-path Workflow commands for GitHub Actions}."
   */
  path: string;

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
   */
  ref: string;

  /**
   * The short ref name of the branch or tag that triggered the workflow run.
   * This value matches the branch or tag name shown on GitHub.
   * For example, `feature-branch-1`.
   *
   * For pull requests, the format is `<pr_number>/merge`.
   */
  ref_name: string;

  /**
   * `true` if branch protections or {@link https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository rulesets} are configured for the ref that triggered the workflow run.
   */
  ref_protected: boolean;

  /**
   * The type of ref that triggered the workflow run. Valid values are `branch` or `tag`.
   */
  ref_type: 'branch' | 'tag' | '';

  /**
   * The owner and repository name. For example, `octocat/Hello-World`.
   */
  repository: string;

  /**
   * The ID of the repository. For example, `123456789`. Note that this is different from the repository name.
   */
  repository_id: string;

  /**
   * The repository owner's username. For example, `octocat`.
   */
  repository_owner: string;

  /**
   * The repository owner's account ID. For example, `1234567`. Note that this is different from the owner's name.
   */
  repository_owner_id: string;

  /**
   * The Git URL to the repository. For example, `git://github.com/octocat/hello-world.git`.
   */
  repositoryUrl: string;

  /**
   * The number of days that workflow run logs and artifacts are kept.
   */
  retention_days: string;

  /**
   * A unique number for each workflow run within a repository.
   * This number does not change if you re-run the workflow run.
   */
  run_id: string;

  /**
   * A unique number for each run of a particular workflow in a repository.
   * This number begins at 1 for the workflow's first run, and increments with each new run.
   * This number does not change if you re-run the workflow run.
   */
  run_number: string;

  /**
   * A unique number for each attempt of a particular workflow run in a repository.
   * This number begins at 1 for the workflow run's first attempt, and increments with each re-run.
   */
  run_attempt: string;

  /**
   * The source of a secret used in a workflow. Possible values are `None`, `Actions`, `Codespaces`, or `Dependabot`.
   */
  secret_source: 'None' | 'Actions' | 'Codespaces' | 'Dependabot';

  /**
   * The URL of the GitHub server. For example: `https://github.com`.
   */
  server_url: string;

  /**
   * The commit SHA that triggered the workflow.
   *
   * The value of this commit SHA depends on the event that triggered the workflow.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows Events that trigger workflows}."
   * For example, `ffac537e6cbbf934b08745a378932722df287a53`.
   */
  sha: string;

  /**
   * A token to authenticate on behalf of the GitHub App installed on your repository.
   * This is functionally equivalent to the GITHUB_TOKEN secret.
   * For more information, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication Automatic token authentication}."
   *
   * Note: This context property is set by the Actions runner, and is only available within the execution steps of a job.
   * Otherwise, the value of this property will be null.
   */
  token: string;

  /**
   * The username of the user that initiated the workflow run.
   *
   * If the workflow run is a re-run, this value may differ from `github.actor`.
   * Any workflow re-runs will use the privileges of `github.actor`, even if the actor initiating the re-run (`github.triggering_actor`) has different privileges.
   */
  triggering_actor: string;

  /**
   * The name of the workflow.
   *
   * If the workflow file doesn't specify a name, the value of this property is the full path of the workflow file in the repository.
   */
  workflow: string;

  /**
   * The ref path to the workflow.
   *
   * For example, `octocat/hello-world/.github/workflows/my-workflow.yml@refs/heads/my_branch`.
   */
  workflow_ref: string;

  /**
   * The commit SHA for the workflow file.
   */
  workflow_sha: string;

  /**
   * The default working directory on the runner for steps, and the default location of your repository when using the {@link https://github.com/actions/checkout checkout} action.
   */
  workspace: string;

  constructor(github: Github) {
    this.action = github.action;
    this.action_path = github.action_path;
    this.action_ref = github.action_ref;
    this.action_repository = github.action_repository;
    this.action_status = github.action_status;
    this.actor = github.actor;
    this.actor_id = github.actor_id;
    this.api_url = github.api_url;
    this.base_ref = github.base_ref;
    this.env = github.env;
    this.event = github.event ?? {};
    this.event_name = github.event_name;
    this.event_path = github.event_path;
    this.graphql_url = github.graphql_url;
    this.head_ref = github.head_ref;
    this.job = github.job;
    this.path = github.path;
    this.ref = github.ref;
    this.ref_name = github.ref_name;
    this.ref_protected = github.ref_protected;
    this.ref_type = github.ref_type;
    this.repository = github.repository;
    this.repository_id = github.repository_id;
    this.repository_owner = github.repository_owner;
    this.repository_owner_id = github.repository_owner_id;
    this.repositoryUrl = github.repositoryUrl;
    this.retention_days = github.retention_days;
    this.run_id = github.run_id;
    this.run_number = github.run_number;
    this.run_attempt = github.run_attempt;
    this.secret_source = github.secret_source;
    this.server_url = github.server_url;
    this.sha = github.sha;
    this.token = github.token;
    this.triggering_actor = github.triggering_actor;
    this.workflow = github.workflow;
    this.workflow_ref = github.workflow_ref;
    this.workflow_sha = github.workflow_sha;
    this.workspace = github.workspace;

    this.setRef();
  }

  setRef() {
    if (this.event_name === 'pull_request' || this.event_name === 'pull_request_target') {
      if (!this.base_ref) {
        this.base_ref = this.event?.pull_request?.base?.ref;
      }
      if (!this.head_ref) {
        this.head_ref = this.event?.pull_request?.head?.ref;
      }
    }
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

    if (!this.ref_type) {
      this.ref_type = refType;
    }

    if (!this.ref_name) {
      this.ref_name = refName;
    }
  }
}
