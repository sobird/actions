import path from 'node:path';

import Executor from '@/pkg/common/executor';

export enum StepStage {
  Pre,
  Main,
  Post,
}

export default abstract class Step {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  abstract pre(): Executor;

  main() {
    throw new Error('main method must be implemented');
  }

  post() {
    throw new Error('post method must be implemented');
  }

  getRunContext() {
    throw new Error('getRunContext method must be implemented');
  }

  getGithubContext(ctx) {
    throw new Error('getGithubContext method must be implemented');
  }

  getStepModel() {
    return { id: this.id, name: this.name };
  }

  getEnv() {
    return {};
  }

  abstract getIfExpression(stage: StepStage): string;

  runStepExecutor(stage: StepStage, executor: Executor) {
    const ifExpression = this.getIfExpression(stage);
    const stepResult = {};

    if (stage === StepStage.Main) {
      // this.stepResult = stepResult;
    }
  }

  symlinkJoin(filename: string, sym: string, parent: string) {
    const dir = path.dirname(filename);
    const dest = path.join(dir, sym);
    const prefix = path.normalize(parent) + path.sep;

    if (dest.startsWith(prefix) || prefix === './') {
      return dest;
    }

    throw new Error(`symlink tries to access file '${dest}' outside of '${parent}`);
  }
}
