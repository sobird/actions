/**
 * Workflow is the structure of the files in .github/workflows
 *
 * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/05/02 21:27:38 created.
 */

import fs from 'fs';

import yaml from 'js-yaml';

import Job from './job';
import On from './on';

type PermissionsKey = 'actions' | 'checks' | 'contents' | 'deployments' | 'id-token' | 'issues' | 'discussions' | 'packages' | 'pages' | 'pull-requests' | 'repository-projects' | 'security-events' | 'statuses';
type PermissionsValue = 'read' | 'write' | 'none' | 'read|write' | 'read|none' | 'write|none' | 'read|write|none';
export type Permissions = { [key in PermissionsKey]: PermissionsValue } | 'read-all' | 'write-all' | {};

class Workflow {
  public file?: string;

  /**
   * 工作流的名称。
   *
   * GitHub 在存储库的“操作”选项卡下显示工作流的名称。
   * 如果省略 name，GitHub 会显示相对于存储库根目录的工作流文件路径。
   */
  public name?: string;

  /**
   * 从工作流生成的工作流运行的名称。
   *
   * GitHub 在存储库的“操作”选项卡上的工作流运行列表中显示工作流运行名称。
   * 如果省略了 run-name 或仅为空格，则运行名称将设置为工作流运行的事件特定信息。
   * 例如，对于由 push 或 pull_request 事件触发的工作流，将其设置为提交消息或拉取请求的标题。
   * 此值可包含表达式，且可引用 github 和 inputs 上下文。
   *
   * @example
   * run-name: Deploy to ${{ inputs.deploy_target }} by @${{ github.actor }}
   */
  public 'run-name'?: string;

  /**
   * 若要自动触发工作流，请使用 on 定义哪些事件可以触发工作流运行。
   *
   * 有关可用事件的列表，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/events-that-trigger-workflows 触发工作流的事件}”。
   * 可以定义单个或多个可以触发工作流的事件，或设置时间计划。
   * 还可以将工作流的执行限制为仅针对特定文件、标记或分支更改。
   *
   * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#on
   */
  public on: On;

  /**
   * 可以使用 `permissions` 修改授予 `GITHUB_TOKEN` 的默认权限，根据需要添加或删除访问权限，以便只授予所需的最低访问权限。
   *
   * 可以使用 `permissions` 作为顶级密钥，以应用于工作流中的所有作业或特定作业。
   * 当你在特定作业中添加 `permissions` 密钥时，该作业中使用 `GITHUB_TOKEN` 的所有操作和运行命令都将获得你指定的访问权限。
   *
   * 对于下表中显示的每个可用范围，可以分配以下权限之一：`read`、`write` 或 `none`。
   * 如果你指定其中任何作用域的访问权限，则所有未指定的作用域都被设置为 `none`。
   *
   * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#permissions
   */
  public permissions: Permissions;

  /**
   * 可用于工作流中所有作业的步骤的变量的 `map`。
   *
   * 还可以设置仅适用于单个作业的步骤或单个步骤的变量。
   * 有关详细信息，请参阅 `jobs.<job_id>.env` 和 `jobs.<job_id>.steps[*].env`。
   */
  public env: object;

  /**
   * 使用 `defaults` 创建将应用于工作流中所有作业的默认设置的 `map`。
   *
   * 您也可以设置只可用于作业的默认设置。 有关详细信息，请参阅 `jobs.<job_id>.defaults`。
   * 使用相同名称定义了多个默认设置时，GitHub 会使用最具体的默认设置。 例如，在作业中定义的默认设置将覆盖在工作流程中定义的同名默认设置。
   */
  public defaults: {
    run: {
      shell: 'unspecified' | 'bash' | 'pwsh' | 'python' | 'sh' | 'cmd' | 'powershell';
      'working-directory': string;
    }
  };

  /**
   * 使用 `concurrency` 以确保只有使用相同并发组的单一作业或工作流才会同时运行。
   *
   * 并发组可以是任何字符串或表达式。
   * 表达式只能使用 `github`、`inputs` 和 `vars` 上下文。 有关表达式的详细信息，请参阅“表达式”。
   * 你还可以在作业级别指定 `concurrency`。有关详细信息，请参阅 `jobs.<job_id>.concurrency`。
   */
  public concurrency: { group: string, 'cancel-in-progress': boolean };

  public jobs: Map<string, Job>;

  constructor({
    name, 'run-name': runName, on, permissions, env, defaults, concurrency, jobs,
  }: Workflow) {
    this.name = name;
    this['run-name'] = runName;
    this.on = new On(on);
    this.permissions = permissions;
    this.env = env;
    this.defaults = defaults;
    this.concurrency = concurrency;
    this.jobs = jobs;
  }

  toJSON() {
    const {
      name, 'run-name': runName, on, permissions, env, defaults, concurrency, jobs,
    } = this;
    return {
      name, 'run-name': runName, on, permissions, env, defaults, concurrency, jobs,
    };
  }

  static Load(path: string) {
    const doc = yaml.load(fs.readFileSync(path, 'utf8'));
    return new Workflow(doc as Workflow);
  }
}

export default Workflow;
