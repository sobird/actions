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
import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Yaml from '@/pkg/common/yaml';

import { inputs } from './inputs';
import { outputs } from './outputs';
import Runs from './runs';

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

  constructor(action: Omit<Action, 'save' | 'dump' | 'executor'>) {
    super(action);
    this.name = action.name;
    this.author = action.author;
    this.description = action.description;
    this.inputs = inputs(action.inputs);
    this.outputs = outputs(action.outputs);
    this.runs = new Runs(action.runs);
  }

  // run action
  executor() {
    return new Executor(() => {
      console.log('run action:', this.name);
    });
  }

  static async Pick(read: (filename: string) => Promise<string | false> | string | false) {
    const yml = await read('action.yml');
    if (yml) {
      return this.Load(yml);
    }

    const yaml = await read('action.yaml');
    if (yaml) {
      return this.Load(yaml);
    }

    const dockerfile = await read('Dockerfile');
    if (dockerfile) {
      return new this({
        name: '(Synthetic)',
        description: 'docker file action',
        runs: {
          using: 'docker',
          image: 'Dockerfile',
        },
      });
    }
  }

  static async Scan(actionDir: string) {
    return Action.Pick((filename) => {
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

export default Action;
