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

import { parse, stringify } from 'yaml';

import { isEmptyDeep } from '@/utils';

import Input from './input';
import Output from './output';

class Action {
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

  runs;

  branding;

  constructor(action: Action) {
    this.name = action.name;
    this.author = action.author;
    this.description = action.description;
    this.inputs = Object.fromEntries(Object.entries(action.inputs).map(([inputId, input]) => {
      return [inputId, new Input(input)];
    }));
    this.outputs = Object.fromEntries(Object.entries(action.outputs).map(([outputId, output]) => {
      return [outputId, new Output(output)];
    }));
  }

  save(path: string, options?: Parameters<typeof stringify>[1]) {
    fs.writeFileSync(path, this.dump(options));
  }

  dump<T extends Parameters<typeof stringify>[1]>(options?: T) {
    return stringify(JSON.parse(JSON.stringify(this, (key, value) => {
      if (isEmptyDeep(value)) {
        return undefined;
      }
      return value;
    })), {
      lineWidth: 150,
      ...options,
    } as unknown as T);
  }

  static Read(path: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(fs.readFileSync(path, 'utf8'), options);
    return new this(doc as Action);
  }

  static Load(str: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(str, options);
    return new Action(doc as Action);
  }
}

export default Action;
