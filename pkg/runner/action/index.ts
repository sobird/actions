/* eslint-disable class-methods-use-this */
/**
 * All actions require a metadata file.
 *
 * The metadata filename must be either action.yml or action.yaml.
 * The data in the metadata file defines the inputs, outputs, and runs configuration for your action.
 *
 * @see https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/06/13 10:55:22 created.
 */

import Executor from '@/pkg/common/executor';
import Yaml from '@/pkg/common/yaml';
import Runner from '@/pkg/runner';

import Input, { InputProps } from './input';
import Output, { OutputProps } from './output';
import Runs, { RunsProps } from './runs';

export interface ActionProps extends Pick<Action, 'Dir' | 'name' | 'author' | 'description'> {
  inputs: Record<string, InputProps>;
  runs: RunsProps;
  outputs: Record<string, OutputProps>;
}

/**
 * You can create actions by writing custom code that interacts with your repository in any way you'd like,
 * including integrating with GitHub's APIs and any publicly available third-party API.
 * For example, an action can publish npm modules, send SMS alerts when urgent issues are created, or deploy production-ready code.
 *
 * You can write your own actions to use in your workflow or share the actions you build with the GitHub community.
 * To share actions you've built with everyone, your repository must be public.
 *
 * Actions can run directly on a machine or in a Docker container.
 * You can define an action's inputs, outputs, and environment variables.
 *
 * Types of actions
 *
 * You can build Docker container, JavaScript, and composite actions.
 * Actions require a metadata file to define the inputs, outputs and main entrypoint for your action.
 * The metadata filename must be either `action.yml` or `action.yaml`.
 *
 * * Docker container
 * * JavaScript
 * * Composite Actions
 *
 */
abstract class Action extends Yaml {
  #dir: string = '';

  /**
   * **Required** The name of your action.
   * GitHub displays the name in the Actions tab to help visually identify actions in each input.
   */
  name: string;

  /**
   * **Optional** The name of the action's author.
   */
  author?: string;

  /**
   * **Required** A short description of the action.
   */
  description: string;

  /**
   * **Optional** Input parameters allow you to specify data that the action expects to use during runtime.
   * GitHub stores input parameters as environment variables.
   * Input ids with uppercase letters are converted to lowercase during runtime.
   * We recommend using lowercase input ids.
   */
  inputs?: Record<string, Input>;

  outputs?: Record<string, Output>;

  runs: Runs;

  branding?: {
    icon: string;
    color: 'white' | 'yello' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray-dark';
  };

  constructor(action: ActionProps) {
    super(action);
    this.name = action.name;
    this.author = action.author;
    this.description = action.description;
    this.inputs = Input.inputs(action.inputs);
    this.outputs = Output.outputs(action.outputs);
    this.runs = new Runs(action.runs);
  }

  /**
   * action container dir
   */
  get Dir() {
    return this.#dir;
  }

  set Dir(dir: string) {
    this.#dir = dir;
  }

  protected pre() {
    return new Executor();
  }

  protected abstract main(): Executor;

  protected post() {
    return new Executor();
  }

  public get Pre() {
    return new Executor(() => {

    }).next(this.pre());
  }

  public get Main() {
    return new Executor(() => {

    }).next(this.main());
  }

  public get Post() {
    return new Executor(() => {

    }).next(this.post());
  }

  public async applyEnv(runner: Runner, out: Record<string, string> = {}) {
    this.applyInput(runner, out);
    Action.ApplyState(runner, out);

    return out;
  }

  applyInput(runner: Runner, out: Record<string, string> = {}) {
    const { inputs = {} } = this;
    Object.entries(inputs).forEach(([inputId, input]) => {
      const key = `INPUT_${inputId.toUpperCase().replace(/[^A-Z0-9-]/g, '_')}`;
      if (!out[key]) {
        // apply input default value
        // eslint-disable-next-line no-param-reassign
        out[key] = input.default.evaluate(runner);
      }
    });

    return out;
  }

  static ApplyState(runner: Runner, out: Record<string, string> = {}) {
    const states = runner.ActionStates;
    Object.entries(states).forEach(([stateId, state]) => {
      // stateId do not toUpperCase
      const key = `STATE_${stateId}`;
      // eslint-disable-next-line no-param-reassign
      out[key] = state;
    });
    return out;
  }
}

export default Action;
