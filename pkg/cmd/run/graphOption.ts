/* eslint-disable no-console */
import chalk from 'chalk';

import Plan from '@/pkg/workflow/plan';
import { Pen } from '@/utils';

export function graphOption(filterPlan: Plan) {
  const pen = new Pen('dashedLine');
  const pads: any[] = [];
  let maxWidth = 0;
  filterPlan.stages.forEach((stage, index) => {
    if (index > 0) {
      const arrowPad = pen.drawArrow();
      maxWidth = Math.max(maxWidth, arrowPad.width);
      pads.push(arrowPad);
    }

    const lables = stage.runs.map((run) => {
      const { job: { strategy } } = run;
      const matrices = strategy.Matrices;

      if (matrices.length > 0) {
        return `${run.jobId} x [matrix: ${matrices.length}]`;
      }

      return run.jobId;
    });
    const labelPad = pen.drawLabels(...lables);
    maxWidth = Math.max(maxWidth, labelPad.width);
    pads.push(labelPad);
  });

  pads.forEach((pad) => {
    console.log(chalk.magentaBright(pad.padLeft(maxWidth)));
  });
}
