/* eslint-disable no-console */
import { Plan } from '@/pkg/workflow/planner';
import { Pen } from '@/utils';

export async function listOption(filterPlan: Plan) {
  const header = {
    stage: 'Stage',
    matrix: 'Matrix',
    jobId: 'Job ID',
    jobName: 'Job name',
    wfName: 'Workflow name',
    wfFile: 'Workflow file',
    events: 'Events',
  };
  const data: Record<string, unknown>[] = [];

  filterPlan.stages.forEach((stage, index) => {
    stage.runs.forEach((run) => {
      const {
        jobId, jobName, workflow, job,
      } = run;
      data.push({
        stage: index,
        matrix: `${job.strategy.getMatrices().length} jobs`,
        jobId,
        jobName,
        wfName: workflow.name,
        wfFile: workflow.file,
        events: workflow.events,
      });
    });
  });

  const pen = new Pen('dashedLine');
  const table = pen.drawTable(data, header);
  console.log(table.toString());
}
