/**
 * Step Action Local
 *
 * sobird<i@sobird.me> at 2024/10/15 22:13:49 created.
 */

import path from 'node:path';

import log4js from 'log4js';

import Executor from '@/pkg/common/executor';

import StepAction from '.';

const logger = log4js.getLogger();

class StepActionLocal extends StepAction {
  protected get PrepareAction() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const actionDir = path.join(runner.config.workdir, this.uses.path);
      return this.LoadAction(actionDir);
    });
  }

  public pre() {
    return new Executor(async () => {
      logger.warn(`'pre' execution is not supported for local action from '${this.uses.path}'`);
    });
  }

  // local LoadAction need after actions/checkout Main
  protected main() {
    return new Executor(async () => {
      return this.action?.Main;
    });
  }
}

export default StepActionLocal;
