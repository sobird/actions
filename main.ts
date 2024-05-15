interface Job { name: string, needs: string[] }

function topologicalSort(jobs: Record<string, Job>) {
  const queue: Job[] = [];

  let jobsNeeds: [string, string[]][] = [];

  Object.entries(jobs).forEach(([jobId, job]) => {
    if (job.needs.length === 0) {
      queue.push(job);
    } else {
      jobsNeeds.push([jobId, job.needs]);
    }
  });

  let k = 0;
  while (k < queue.length) {
    const zeroNeedsJob = queue[k];
    const newJobsNeeds: [string, string[]][] = [];
    jobsNeeds.forEach(([jobId, needs]) => {
      const newNeeds = needs.filter((need) => { return need !== zeroNeedsJob.name; });
      if (newNeeds.length === 0) {
        queue.push(jobs[jobId]);
      } else {
        newJobsNeeds.push([jobId, newNeeds]);
      }
    });

    jobsNeeds = newJobsNeeds;

    k += 1;
  }

  if (queue.length < Object.keys(jobs).length) {
    return [];
  }
  return queue;
}

// 使用示例
const jobs = {
  B: { name: 'B', needs: ['A'] },
  C: { name: 'C', needs: ['A', 'B'] },
  D: { name: 'D', needs: ['C'] },
  A: { name: 'A', needs: [] },
};

try {
  const sorted = topologicalSort(jobs);
  console.log('sorted', sorted); // 输出拓扑排序结果
} catch (error) {
  console.error(error.message);
}
