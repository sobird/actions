import type Job from '.';

export function JobFactory(job: Job) {
  const { uses } = job;
  if (uses) {
    const isYaml = uses.match(/\.(ya?ml)(?:$|@)/);

    if (isYaml) {
      const isLocalPath = uses.startsWith('./');
      const isRemotePath = uses.match(/^[^.](.+?\/){2,}\S*\.ya?ml@/);
      if (isLocalPath) {
        return JobType.ReusableWorkflowLocal;
      } if (isRemotePath) {
        return JobType.ReusableWorkflowRemote;
      }
    }

    // 如果不是有效的工作流路径，返回无效类型
    throw new Error(`\`uses\` key references invalid workflow path '${uses}'. Must start with './' if it's a local workflow, or must start with '<org>/<repo>/' and include an '@' if it's a remote workflow`);
  }

  // 如果不是可复用的工作流，则返回默认类型
  return JobType.Default;
}
