/**
 * Build the storage path of a task's log file.
 *
 * Mirrors upstream Gitea's logFileName: the task id is sharded into a
 * two-digit hex directory so a single directory never holds too many files,
 * e.g. logFileName('test2', 47) === 'artifact-test2/2f/47.log'.
 */
export function logFileName(repoFullName: string, taskId: number): string {
  const shard = (taskId & 0xff).toString(16).padStart(2, '0');
  return `artifact-${repoFullName.replaceAll('/', '-')}/${shard}/${taskId}.log`;
}
