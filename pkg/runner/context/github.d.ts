/**
 * 工作流程中任何作业或步骤期间可用的顶层上下文。
 *
 * `github` 上下文包含有关工作流运行和触发运行的事件的信息。 还可以读取环境变量中的大多数 `github` 上下文数据。
 */
export interface Github {
  /**
   * 正在运行的操作的名称，或步骤的 id。
   *
   * 在当前步骤运行脚本（无 id）时，GitHub 删除特殊字符并使用名称 __run。
   * 如果在同一作业中多次使用相同的操作，则名称将包含一个前面跟序号和下划线的后缀。
   * 例如，运行的第一个脚本名称 __run，则第二个脚本将命名为 __run_2。
   * 同样，actions/checkout 的第二次调用将为 actionscheckout2。
   */
  action: string;
  /**
   * 操作所在的路径。
   *
   * 此属性仅在复合操作中受支持。可以使用此路径访问与操作位于同一存储库中的文件，例如将目录更改为该路径： `cd ${{ github.action_path }}` 。
   */
  action_path: string;
  /**
   * 对于执行操作的步骤，这是正在执行的操作的引用。 例如 `v2`。
   *
   * 不要在 `run` 关键字中使用。 若要使此上下文适用于复合操作，请在复合操作的 `env` 上下文中引用它。
   */
  action_ref: string;
  /**
   * 对于执行操作的步骤，这是操作的所有者和存储库名称。 例如 `actions/checkout`。
   *
   * 不要在 `run` 关键字中使用。 若要使此上下文适用于复合操作，请在复合操作的 `env` 上下文中引用它。
   */
  action_repository: string;

  /**
   * 对于复合操作，这是复合操作的当前结果。
   */
  action_status: string;
  /**
   * 触发初始工作流运行的用户的用户名。
   *
   * 如果工作流运行是重新运行，则此值可能与 github.triggering_actor 不同。
   * 即使启动重新运行的参与者 (github.triggering_actor) 具有不同的权限，任何工作流重新运行都将使用 github.actor 的权限。
   */
  actor: string;
  /**
   * 触发初始工作流运行的个人或应用的帐户 ID。 例如 1234567。 请注意，这与参与者用户名不同。
   */
  actor_id: string;

  /**
   * GitHub REST API 的 URL。
   */
  api_url: string;

  /**
   * 工作流运行中拉取请求的 base_ref 或目标分支。
   *
   * 仅当触发工作流运行的事件是 pull_request 或 pull_request_target 时，才可使用此属性。
   */
  base_ref: string;
  /**
   * 运行器上从工作流命令到设置环境变量的文件路径。
   *
   * 此文件对于当前步骤是唯一的，并且是作业中每个步骤的不同文件。
   * 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable GitHub Actions 的工作流命令}”。
   */
  env: string;
  /**
   * 完整事件 Webhook 有效负载。
   *
   * 您可以使用上下文访问事件的个别属性。
   * 此对象与触发工作流运行的事件的 web 挂钩有效负载相同，并且对于每个事件都是不同的。
   * 每个 GitHub Actions 事件的 Webhook 在“{@link https://docs.github.com/zh/actions/using-workflows/events-that-trigger-workflows 触发工作流的事件}”中链接。
   * 例如，对于由 {@link https://docs.github.com/zh/actions/using-workflows/events-that-trigger-workflows#push push 事件}触发的工作流运行，此对象包含推送 {@link https://docs.github.com/zh/webhooks-and-events/webhooks/webhook-events-and-payloads#push webhook 有效负载}的内容。
   */
  event: object;
  /**
   * 触发工作流运行的事件的名称。
   */
  event_name: string;
  /**
   * 运行器上包含完整事件 Webhook 有效负载的文件的路径。
   */
  event_path: string;
  /**
   * GitHub GraphQL API 的 URL。
   */
  graphql_url: string;
  /**
   * 工作流运行中拉取请求的 `head_ref` 或源分支。
   *
   * 仅当触发工作流运行的事件是 `pull_request` 或 `pull_request_target` 时，才可使用此属性。
   */
  head_ref: string;
  /**
   * 当前作业的 job_id。
   *
   * 注意：此上下文属性是由 Actions 运行程序设置的，仅在作业的执行 steps 中可用。 否则，此属性的值将为 null。
   */
  job: string;
  /**
   * 运行器上从工作流命令设置系统 PATH 变量的文件的路径。
   *
   * 此文件对于当前步骤是唯一的，并且是作业中每个步骤的不同文件。
   * 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-commands-for-github-actions#adding-a-system-path GitHub Actions 的工作流命令}”。
   */
  path: string;
  /**
   * 触发工作流运行的分支或标记的格式完整的参考。
   *
   * 对于 `push` 触发的工作流，这是推送的分支或标记参考。
   * 对于 `pull_request` 触发的工作流，这是拉取请求合并分支。
   * 对于 `release` 触发的工作流，这是创建的发布标记。
   * 对于其他触发器，这是触发工作流运行的分支或标记参考。
   * 此变量仅在分支或标记可用于事件类型时才会设置。
   * 给定的参考格式完整，这意味着对于分支，其格式为 `refs/heads/<branch_name>`，
   * 对于拉取请求，其格式为 `refs/pull/<pr_number>/merge`，对于标签，其格式为 `refs/tags/<tag_name>`。
   * 例如，`refs/heads/feature-branch-1`。
   */
  ref: string;
  /**
   * 触发工作流运行的分支或标记的短参考名称。
   *
   * 此值与 `GitHub` 上显示的分支或标记名称匹配。 例如 `feature-branch-1`。
   * 拉取请求的格式为 `<pr_number>/merge`。
   */
  ref_name: string;
  /**
   * 如果为触发工作流运行的 ref 配置分支保护 或 规则集 ，则为 true。
   */
  ref_protected: boolean;
  /**
   * The type of ref that triggered the workflow run. Valid values are `branch` or `tag`.
   */
  ref_type: 'branch' | 'tag';
  /**
   * 所有者和存储库名称。 例如，octocat/Hello-World。
   */
  repository: string;
  /**
   * 存储库的 ID。 例如 123456789。 请注意，这与存储库名称不同。
   */
  repository_id: string;
  /**
   * 存储库所有者的用户名。 例如 octocat。
   */
  repository_owner: string;
  /**
   * 存储库所有者的帐户 ID。 例如 1234567。 请注意，这与所有者名称不同。
   */
  repository_owner_id: string;
  /**
   * 存储库的 Git URL。 例如，`git://github.com/octocat/hello-world.git`。
   */
  repositoryUrl: string;
  /**
   * 工作流运行日志和项目保留的天数。
   */
  retention_days: string;

  /**
   * 存储库中每个工作流运行的唯一编号。
   *
   * 如果您重新执行工作流程运行，此编号不变。
   */
  run_id: string;
  /**
   * 仓库中特定工作流程每个运行的唯一编号。
   *
   * 工作流首次运行时，此编号从 1 开始，并随着每次新的运行而递增。 如果您重新执行工作流程运行，此编号不变。
   */
  run_number: string;
  /**
   * 存储库中特定工作流运行的每次尝试的唯一编号。
   *
   * 对于工作流程运行的第一次尝试，此数字从 1 开始，并随着每次重新运行而递增。
   */
  run_attempt: string;
  /**
   * 工作流中使用的机密的来源。
   *
   * 可能的值为 None、Actions、Codespaces 或 Dependabot。
   */
  secret_source: 'None' | 'Actions' | 'Codespaces' | 'Dependabot';
  /**
   * GitHub 服务器的 URL。 例如：https://github.com。
   */
  server_url: string;
  /**
   * 触发工作流的提交 SHA。
   *
   * 此提交 SHA 的值取决于触发工作流程的事件。 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/events-that-trigger-workflows 触发工作流的事件}”。
   * 例如，ffac537e6cbbf934b08745a378932722df287a53。
   */
  sha: string;
  /**
   * 用于代表存储库中安装的 GitHub 应用程序进行身份验证的令牌。
   *
   * 在功能上，这与 `GITHUB_TOKEN` 机密等效。 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/security-guides/automatic-token-authentication 自动令牌身份验证}”。
   * 注意：此上下文属性是由 Actions 运行程序设置的，仅在作业的执行 steps 中可用。 否则，此属性的值将为 null。
   */
  token: string;
  /**
   * 发起工作流运行的用户的用户名。
   *
   * 如果工作流运行是重新运行，则此值可能与 `github.actor` 不同。
   * 即使启动重新运行的参与者 (`github.triggering_actor`) 具有不同的权限，任何工作流重新运行都将使用 `github.actor` 的权限。
   */
  triggering_actor: string;
  /**
   * 工作流的名称。
   *
   * 如果工作流程文件未指定 name，则此属性的值是存储库中工作流程文件的完整路径。
   */
  workflow: string;
  /**
   * 工作流的引用路径。
   *
   * 例如，`octocat/hello-world/.github/workflows/my-workflow.yml@refs/heads/my_branch`。
   */
  workflow_ref: string;
  /**
   * 工作流文件的提交 SHA
   */
  workflow_sha: string;
  /**
   * 运行器上步骤的默认工作目录，以及使用 checkout 操作时存储库的默认位置。
   */
  workspace: string;
}
