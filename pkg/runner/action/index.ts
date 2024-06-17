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

import fs from 'node:fs';

import Yaml from '@/pkg/common/yaml';

import { inputs } from './inputs';
import { outputs } from './outputs';
import Runs from './runs';

class Action extends Yaml {
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
  inputs?;

  outputs?;

  runs: Runs;

  branding?: {
    icon: string;
    color: 'white' | 'yello' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray-dark';
  };

  constructor(action: Omit<Action, 'save' | 'dump'>) {
    super(action);
    this.name = action.name;
    this.author = action.author;
    this.description = action.description;
    this.inputs = inputs(action.inputs);
    this.outputs = outputs(action.outputs);
    this.runs = new Runs(action.runs);
  }

  static Read(actionPath: string) {
    const stat = fs.statSync(actionPath);
    let actionFile = '';
    if (stat.isFile()) {
      actionFile = actionPath;
    }
    return super.Read(actionFile);
  }
}

export default Action;
