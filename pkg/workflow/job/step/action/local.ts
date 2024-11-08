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
  public pre() {
    return new Executor(async () => {
      logger.warn(`'pre' execution is not supported for local action from '${this.uses.path}'`);
    });
  }

  // local LoadAction need after actions/checkout Main
  public main() {
    return this.runtime(new Executor(async (ctx) => {
      const runner = ctx!;
      const actionDir = path.join(runner.config.workdir, this.uses.path);
      await this.LoadAction(actionDir).execute(ctx);
      return this.action?.Main;
    }));
  }

  public post() {
    return this.runtime(new Executor(() => {
      return this.action?.Post;
    }), 'Post').if(this.ShouldRunPost);
  }
}

export default StepActionLocal;
