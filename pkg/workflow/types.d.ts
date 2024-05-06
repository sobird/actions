/**
 * * 工作流还将接收 github.event.inputs 上下文中的输入。
 * inputs 上下文和 github.event.inputs 上下文中的信息完全相同，但 inputs 上下文将布尔值保留为布尔值，而不是将它们转换为字符串。
 * choice 类型解析为字符串，是单个可选选项。
 * * inputs 的顶级属性的最大数目为 10。
 * * inputs 的最大有效负载为 65,535 个字符。
 */
export interface WorkflowDispatchInputs {
  description: string;
  required: boolean;
  default?: string;
  type: 'boolean' | 'choice' | 'number' | 'environment' | 'string'
  options?: string[];
}

export interface OnEvents {
  branch_protection_rule: {
    types: Array<'created', 'edited', 'deleted'>;
  };
  check_run: {
    types: Array<'rerequested', 'completed'>;
  };
  check_suite: {
    types: Array<'completed'>;
  };
  create: string;
  delete: string;
  deployment: string;
  deployment_status: string;
  discussion: {
    types: Array<'created', 'edited', 'deleted', 'transferred', 'pinned', 'unpinned', 'labeled', 'unlabeled', 'locked', 'unlocked', 'category_changed', 'answered', 'unanswered'>;
  };
  discussion_comment: {
    types: Array<'created', 'edited', 'deleted'>;
  };
  /**
   * 当有人复刻存储库时运行工作流程
   *
   * 注意：仅当工作流文件在默认分支上时，此事件才会触发工作流运行。
   */
  fork: string;
  /**
   * 在有人创建或更新 Wiki 页面时运行工作流程
   *
   * 注意：仅当工作流文件在默认分支上时，此事件才会触发工作流运行。
   */
  gollum: string;

  /**
   * 在创建、编辑或删除议题或拉取请求评论时运行工作流程。
   *
   * 注意：仅当工作流文件在默认分支上时，此事件才会触发工作流运行。
   */
  issue_comment: {
    types: Array<'created', 'edited', 'deleted'>;
  };
  issues: {
    types: Array<'opened', 'edited', 'deleted', 'transferred', 'pinned', 'unpinned', 'closed', 'reopened', 'assigned', 'unassigned', 'labeled', 'unlabeled', 'locked', 'unlocked', 'milestoned', 'demilestoned'>
  };
  label: {
    types: Array<'created', 'edited', 'deleted'>;
  };
  merge_group:{
    types: Array<'checks_requested'>;
  };
  milestone: {
    types: Array<'created', 'closed', 'opened', 'edited', 'deleted'>;
  };
  page_build: string;
  project: {
    types: Array<'created', 'closed', 'reopened', 'edited', 'deleted'>;
  };
  project_card: {
    types: Array<'created', 'moved', 'converted', 'edited', 'deleted'>;
  };
  project_column: {
    types: Array<'created', 'updated', 'moved', 'deleted'>;
  };
  public: string;
  pull_request: {
    types: Array<'assigned', 'unassigned', 'labeled', 'unlabeled', 'opened', 'edited', 'closed', 'reopened', 'synchronize', 'converted_to_draft', 'locked', 'unlocked', 'enqueued', 'dequeued', 'milestoned', 'demilestoned', 'ready_for_review', 'review_requested', 'review_request_removed', 'auto_merge_enabled', 'auto_merge_disabled'>;
    branches: string[];
    'branches-ignore': string[];
    paths: string[];
    'paths-ignore': string[];
  };
  pull_request_comment: string;
  pull_request_review: {
    types: Array<'edited', 'edited', 'dismissed'>;
  };
  pull_request_review_comment: {
    types: Array<'created', 'edited', 'deleted'>;
  };
  pull_request_target: {
    types: Array<'assigned', 'unassigned', 'labeled', 'unlabeled', 'opened', 'edited', 'closed', 'reopened', 'synchronize', 'converted_to_draft', 'ready_for_review', 'locked', 'unlocked', 'review_requested', 'review_request_removed', 'auto_merge_enabled', 'auto_merge_disabled'>;
    branches: string[];
    'branches-ignore': string[];
    paths: string[];
    'paths-ignore': string[];
  };
  push: string | {
    branches: string[];
    'branches-ignore': string[];
    paths: string[];
    'paths-ignore': string[];
    tags: string[];
    'tags-ignore': string[];
  };
  registry_package: {
    types: Array<'published', 'updated'>
  };
  release: {
    types: Array<'published', 'unpublished', 'created', 'edited', 'deleted', 'prereleased', 'released'>;
  };
  repository_dispatch: {
    types: string[];
  };
  schedule: {
    cron: string;
  }[];
  status: string;
  watch: {
    types: Array<'started'>
  }
  workflow_call: null;
  workflow_dispatch: {
    inputs: {
      [key in string]: WorkflowDispatchInputs;
    };
  };
  workflow_run: {
    workflows: string[];
    types: Array<'completed', 'requested', 'in_progress'>;
  }
}

export type On = OnEvents | Array<keyof OnEvents> | string;

type PermissionsKey = 'actions' | 'checks' | 'contents' | 'deployments' | 'id-token' | 'issues' | 'discussions' | 'packages' | 'pages' | 'pull-requests' | 'repository-projects' | 'security-events' | 'statuses';
type PermissionsValue = 'read' | 'write' | 'none' | 'read|write' | 'read|none' | 'write|none' | 'read|write|none';
export type Permissions = { [key in PermissionsKey]: PermissionsValue } | 'read-all' | 'write-all' | Record<string, never>;

export type Concurrency = { group: string, 'cancel-in-progress': boolean };

export type Defaults = {
  run: {
    shell: 'unspecified' | 'bash' | 'pwsh' | 'python' | 'sh' | 'cmd' | 'powershell';
    'working-directory': string;
  }
};
