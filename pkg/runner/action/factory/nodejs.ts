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
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(action: NodeJSActionProps) {
    super(action as ActionProps);
  }

  public get HasPre() {
    return new Conditional((runner) => {
      return !!this.runs['pre-if'].evaluate(runner!) && !!this.runs.pre;
    });
  }

  public get HasPost() {
    return new Conditional((runner) => {
      return !!this.runs['post-if'].evaluate(runner!) && !!this.runs.post;
    });
  }

  pre() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { container } = runner!;
      // no state
      const env = runner.stepAction?.environment;
      this.applyInput(runner!, env);
      await container?.applyPath(runner!.prependPath, env);

      return container?.exec(['node', path.join(this.Dir, this.runs.pre)], { env });
    }).if(this.HasPost);
  }

  main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const env = runner.stepAction?.environment;

      await this.applyEnv(runner, env);
      await runner.container?.applyPath(runner.prependPath, env);

      console.log('env', env);

      return runner.container?.exec(['node', path.join(this.Dir, this.runs.main)], { env });
    });
  }

  post() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { container } = runner!;
      const env = runner.stepAction?.environment;

      NodeJSAction.ApplyState(runner, env);
      await container?.applyPath(runner.prependPath, env);

      console.log('post env', env);
      return container?.exec(['node', path.join(this.Dir, this.runs.post)], { env });
    }).if(this.HasPost);
  }
}

export default NodeJSAction;
