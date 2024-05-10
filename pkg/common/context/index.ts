import { Env } from './env';
import { Github } from './github';
import { Inputs } from './inputs';
import { Job } from './job';
import { Jobs } from './jobs';
import { Matrix } from './matrix';
import { Needs } from './needs';
import { Runner } from './runner';
import { Secrets } from './secrets';
import { Steps } from './steps';
import { Strategy } from './strategy';
import { Vars } from './vars';

/**
 * 上下文是一种访问工作流运行、变量、运行器环境、作业及步骤相关信息的方式。 每个上下文都是一个包含属性的对象，属性可以是字符串或其他对象。
 *
 * 在不同的工作流运行条件下，上下文、对象和属性大不相同。 例如，matrix 上下文仅针对矩阵中的作业填充。
 *
 * 您可以使用表达式语法访问上下文。 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/learn-github-actions/expressions 表达式}”。
 *
 * `${{ <context> }}`
 */
export default interface Context {
  github: Github;
  env: Env;
  vars: Vars;
  job: Job;
  jobs: Jobs;
  steps: Steps;
  runner: Runner;
  secrets: Secrets;
  strategy: Strategy;
  matrix: Matrix;
  needs: Needs;
  inputs: Inputs;
}
