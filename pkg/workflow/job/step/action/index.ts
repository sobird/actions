/* eslint-disable class-methods-use-this */
import fs from 'node:fs';
import path from 'node:path';

import log4js from 'log4js';
import { parse } from 'yaml';

import Executor, { Conditional } from '@/pkg/common/executor';
import Action, { ActionProps } from '@/pkg/runner/action';
import ActionCommandFile from '@/pkg/runner/action/command/file';
import ActionFactory from '@/pkg/runner/action/factory';
import Step from '@/pkg/workflow/job/step';
import { withTimeout } from '@/utils';

const logger = log4js.getLogger();

abstract class StepAction extends Step {
  environment: Record<string, string> = {};

  action?: Action;

  public prepareAction() { return new Executor(); }

  public pre() { return new Executor(); }

  public abstract main(): Executor;

  public post() { return new Executor(); }

  protected executor(main: Executor) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const { id } = this;
      const { context, IntraActionState } = runner;
      // set current step
      context.github.action = id;
      runner.step = this;
      IntraActionState[id] = {};
      context.StepResult = {
        outcome: 'success',
        conclusion: 'success',
        outputs: {},
      };

      // init action environment
      runner.Assign(
        this.environment,
        runner.Env,
        runner.context.github.Env,
        runner.context.runner.Env,
        this.Env(runner),
      );

      try {
        const enabled = this.if.evaluate(runner);

        if (!enabled) {
          context.StepResult = {
            outcome: 'skipped',
            conclusion: 'skipped',
          };
          return;
        }
      } catch (err) {
        context.StepResult = {
          outcome: 'failure',
          conclusion: 'failure',
        };
        throw err;
      }

      const actionCommandFile = new ActionCommandFile(runner);
      await actionCommandFile.initialize(this.uuid);
      const timeoutMinutes = Number(this['timeout-minutes'].evaluate(runner)) || 60;
      await withTimeout(main.execute(runner), timeoutMinutes * 60 * 1000);

      await actionCommandFile.process();
    });
  }

  protected get ShouldRunPre() {
    return new Conditional((ctx) => {
      const runner = ctx!;
      if (!this.action) {
        logger.debug("skip pre step for '%s': no action model available", this.Name(runner));
        return false;
      }
      return true;
    });
  }

  protected get ShouldRunPost() {
    return new Conditional((ctx) => {
      const runner = ctx!;
      const { StepResult } = runner.context;

      if (!StepResult) {
        logger.debug("skipping post step for '%s'; step was not executed", this.Name(runner));
        return false;
      }

      if (StepResult.conclusion === 'skipped') {
        logger.debug("skipping post step for '%s'; main step was skipped", this.Name(runner));
        return false;
      }

      if (!this.action) {
        logger.debug("skipping post step for '%s': no action model available", this.Name(runner));
        return false;
      }
      return true;
    });
  }

  // load action from container
  LoadAction(actionDir: string) {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const actionContainerDir = runner.container?.resolve(actionDir) || '';
      const ymlFile = path.join(actionDir, 'action.yml');
      const ymlEntry = await runner.container?.getContent(ymlFile);
      if (ymlEntry) {
        this.action = ActionFactory.create(parse(ymlEntry.body));
        this.action.Dir = actionContainerDir;
        return;
      }
      const yamlEntry = await runner.container?.getContent(path.join(actionDir, 'action.yaml'));
      if (yamlEntry) {
        this.action = ActionFactory.create(parse(yamlEntry.body));
        this.action.Dir = actionContainerDir;
        return;
      }

      const dockerFileEntry = await runner.container?.getContent(path.join(actionDir, 'Dockerfile'));
      if (dockerFileEntry) {
        this.action = ActionFactory.create({
          name: '(Synthetic)',
          description: 'docker file action',
          runs: {
            using: 'docker',
            image: 'Dockerfile',
          },
        } as ActionProps);
        this.action.Dir = actionContainerDir;
        return;
      }
      throw Error(`Can't find 'action.yml', 'action.yaml' or 'Dockerfile' under ${actionDir}. Did you forget to run actions/checkout before running your local action?`);
    });
  }

  /**
   * @deprecated
   */
  private static async PickAction(read: (filename: string) => Promise<string | false> | string | false) {
    const yml = await read('action.yml');
    if (yml) {
      return ActionFactory.create(parse(yml));
    }

    const yaml = await read('action.yaml');
    if (yaml) {
      return ActionFactory.create(parse(yaml));
    }

    const dockerfile = await read('Dockerfile');
    if (dockerfile) {
      return ActionFactory.create({
        name: '(Synthetic)',
        description: 'docker file action',
        runs: {
          using: 'docker',
          image: 'Dockerfile',
        },
      } as ActionProps);
    }
    const fullPath = 'fullPath';
    throw Error(`Can't find 'action.yml', 'action.yaml' or 'Dockerfile' under '${fullPath}'. Did you forget to run actions/checkout before running your local action?`);
  }

  /**
   * @deprecated
   */
  private static async ScanAction(actionDir: string) {
    return this.PickAction((filename) => {
      if (!fs.existsSync(actionDir)) {
        return false;
      }

      const stat = fs.statSync(actionDir);

      if (stat.isDirectory()) {
        const file = path.join(actionDir, filename);
        if (fs.existsSync(file)) {
          return fs.readFileSync(file, 'utf8');
        }
      }

      if (stat.isFile()) {
        if (fs.existsSync(actionDir)) {
          return fs.readFileSync(actionDir, 'utf8');
        }
      }

      return false;
    });
  }
}

export default StepAction;
