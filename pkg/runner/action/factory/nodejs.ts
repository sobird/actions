/**
 * javascript action handler
 *
 * sobird<i@sobird.me> at 2024/10/16 21:08:02 created.
 */

import path from 'node:path';

import Executor, { Conditional } from '@/pkg/common/executor';

import Action, { ActionProps } from '..';

interface Output {
  description: string;
  value?: string
}

interface Runs {
  using: string;
  main: string;
  pre?: string;
  'pre-if'?: string;
  post?: string;
  'post-if'?: string;
}

export interface NodeJSActionProps extends Omit<ActionProps, 'outputs' | 'runs' | 'Dir'> {
  outputs: Record<string, Output>;
  runs: Runs;
}

class NodeJSAction extends Action {
  protected pre() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { container } = runner!;

      const env = runner.stepAction?.environment;
      this.applyInput(runner!, env);
      await container?.applyPath(runner!.prependPath, env);

      return container?.exec(['node', path.join(this.Dir, this.runs.pre)], { env });
    }).if(this.HasPost);
  }

  protected main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const env = runner.stepAction?.environment;
      await runner.container?.applyPath(runner.prependPath, env);

      return runner.container?.exec(['node', path.join(this.Dir, this.runs.main)], { env });
    });
  }

  protected post() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { container } = runner!;
      const env = runner.stepAction?.environment;

      NodeJSAction.ApplyState(runner, env);
      await container?.applyPath(runner.prependPath, env);

      return container?.exec(['node', path.join(this.Dir, this.runs.post)], { env });
    }).if(this.HasPost);
  }
}

export default NodeJSAction;
