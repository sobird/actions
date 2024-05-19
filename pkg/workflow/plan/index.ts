import Stage from './stage';

export { default as Stage } from './stage';
export { default as Run } from './run';

/** Plan contains a list of stages to run in series */
export default class Plan {
  constructor(public stages: Stage[] = []) {}

  /** determines the max name length of all jobs */
  maxRunNameLen() {
    let maxRunNameLen = 0;
    for (const stage of this.stages) {
      for (const run of stage.runs) {
        const runNameLen = run.toString().length;
        if (runNameLen > maxRunNameLen) {
          maxRunNameLen = runNameLen;
        }
      }
    }
    return maxRunNameLen;
  }

  /** Merge stages with existing stages in plan */
  merge(plan: Plan) {
    const { stages } = plan;
    // 确定新阶段列表的大小
    const newSize = Math.max(this.stages.length, stages.length);
    const newStages: Stage[] = new Array(newSize);

    // 合并阶段
    for (let i = 0; i < newSize; i++) {
      // 创建新的 Stage 实例
      const newStage = new Stage([]);
      newStages[i] = newStage;

      // 如果原始计划中的阶段索引存在，则添加其运行项
      if (i < this.stages.length) {
        newStage.runs = newStage.runs.concat(this.stages[i].runs);
      }

      // 如果新阶段列表中的索引存在，则添加其运行项
      if (i < stages.length) {
        newStage.runs = newStage.runs.concat(stages[i].runs);
      }
    }

    // 更新计划中的阶段列表
    this.stages = newStages;
  }
}
