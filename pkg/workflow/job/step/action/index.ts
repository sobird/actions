/* eslint-disable class-methods-use-this */
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

type StepStage = 'Pre' | 'Main' | 'Post';

abstract class StepAction extends Step {
  /**
   * for pre/main/post stage use
   */
  environment: Record<string, string> = {};

  action?: Action;

  protected get PrepareAction() { return new Executor(); }

  protected pre() { return new Executor(); }

  protected abstract main(): Executor;

  protected post() { return new Executor(); }

  public get Pre() {
    return Executor.Pipeline(this.PrepareAction, this.runtime(this.pre(), 'Pre').if(this.ShouldRunPre));
  }

  public get Main() {
    return this.runtime(this.main(), 'Main');
  }

  public get Post() {
    return this.runtime(new Executor(() => { return this.action?.Post; }), 'Post').if(this.ShouldRunPost);
  }

  // action runtime
  protected runtime(executor: Executor, stage: StepStage) {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { id } = this;
      const { context } = runner;

      // set current step
      context.github.action = id;
      runner.stepAction = this;
      context.StepResult = {};

      if (this.uses.ref) {
        context.github.action_ref = this.uses.ref;
        context.github.action_repository = this.uses.repository;
      }

      try {
        const enabled = this.if.evaluate(runner);

        if (!enabled) {
          context.StepResult = {
            outcome: 'skipped',
            conclusion: 'skipped',
          };
          logger.debug("Skipping step '%s' due to '%s'", this.Name(runner), this.if.source || '');
          return;
        }
      } catch (err) {
        context.StepResult = {
          outcome: 'failure',
          conclusion: 'failure',
        };
        logger.error('\u274C Error in if-expression: "if: %s" (%s)', this.if.source, (err as Error).message);
        return;
      }

      logger.info('\u{1F525} Starting: %s %s', stage, this.Name(runner));

      const actionCommandFile = new ActionCommandFile(runner);
      await actionCommandFile.initialize(this.uuid);
      const timeoutMinutes = Number(this['timeout-minutes'].evaluate(runner)) || 60;

      const name = this.Name(runner);
      try {
        // this.applyEnv(runner, this.environment);
        await withTimeout(executor.execute(runner), timeoutMinutes * 60 * 1000);
        await actionCommandFile.process();
        logger.info('🍏', `Finishing: ${stage} ${name}`);
      } catch (error) {
        // steps 按照循序执行，如果有一个步骤失败，则后续步骤会跳过，且该步骤所在的job状态变为 failure
        logger.error((error as Error).message);
        context.StepResult = {
          outcome: 'failure',
        };

        try {
          const continueOnError = this['continue-on-error'].evaluate(runner);
          if (continueOnError) {
            logger.info('Failed but continue next step');
            context.StepResult = {
              conclusion: 'success',
            };
          } else {
            context.StepResult = {
              conclusion: 'failure',
            };
          }
        } catch (err) {
          context.StepResult = {
            conclusion: 'failure',
          };

          logger.error('🍎', `Error in continue-on-error-expression: "continue-on-error: ${this['continue-on-error'].source}" (${(err as Error).message})`);
        }

        logger.error('🍎', `Failure: ${stage} ${name}`);
      }
    });
  }

  protected get ShouldRunPre() {
    return new Conditional((ctx) => {
      const runner = ctx!;
      if (!this.action) {
        logger.debug("Skip pre step for '%s': no action model available", this.Name(runner));
        return false;
      }
      if (!this.action.HasPost.evaluate(ctx)) {
        logger.debug("Skipping pre step for '%s': no action pre available", this.Name(runner));
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
        logger.debug("Skipping post step for '%s'; step was not executed", this.Name(runner));
        return false;
      }

      if (StepResult.conclusion === 'skipped') {
        logger.debug("Skipping post step for '%s'; main step was skipped", this.Name(runner));
        return false;
      }

      if (!this.action) {
        logger.debug("Skipping post step for '%s': no action model available", this.Name(runner));
        return false;
      }
      if (!this.action.HasPost.evaluate(ctx)) {
        logger.debug("Skipping post step for '%s': no action post available", this.Name(runner));
        return false;
      }
      return true;
    });
  }

  // load action from container on Prepare Stage
  LoadAction(actionDir: string) {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const actionContainerDir = runner.container?.resolve(actionDir) || '';
      const ymlFile = path.join(actionDir, 'action.yml');
      const ymlEntry = await runner.container?.getContent(ymlFile);

      // set context github action path
      runner.context.github.action_path = actionContainerDir;

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

  // static async create(step: StepProps) {
  //   if (!step.run && !step.uses) {
  //     throw Error('every step must define a `uses` or `run` key');
  //   }

  //   if (step.run && step.uses) {
  //     throw Error('a step cannot have both the `uses` and `run` keys');
  //   }

  //   if (step.uses) {
  //     if (step.uses.startsWith('docker://')) {
  //       const StepActionDocker = (await import('./docker')).default;
  //       return new StepActionDocker(step);
  //     } if (step.uses.startsWith('./') || step.uses.startsWith('.\\')) {
  //       const StepActionLocal = (await import('./local')).default;
  //       return new StepActionLocal(step);
  //     }
  //     const StepActionRemote = (await import('./remote')).default;
  //     return new StepActionRemote(step);
  //   }

  //   const StepActionScript = (await import('./script')).default;
  //   return new StepActionScript(step);
  // }
}

export default StepAction;
