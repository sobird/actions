import Job, { JobProps } from '.';
import ReusableWorkflowJob from './reusable-workflow-job';

export function JobFactory(job: JobProps) {
  const { uses } = job;
  if (uses) {
    const isYaml = uses.match(/\.(ya?ml)(?:$|@)/);
    if (isYaml) {
      return new ReusableWorkflowJob(job);
    }
    throw new Error(`'uses' key references invalid workflow path '${uses}'. Must start with './' if it's a local workflow, or must start with '<org>/<repo>/' and include an '@' if it's a remote workflow`);
  }

  return new Job(job);
}
