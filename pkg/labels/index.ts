/**
 * 标签解析
 * @todo
 * 自动处理labels
 *
 * sobird<i@sobird.me> at 2024/04/24 18:59:14 created.
 */

const SCHEME_HOST = 'host';
const SCHEME_DOCKER = 'docker';

interface Label {
  name: string;
  schema: string;
  rest: string;
}

class Labels {
  private labels: Label[] = [];

  constructor(labels: (Label | string)[] = []) {
    labels.forEach((label) => {
      const result = Labels.Parse(label);
      if (result) {
        this.labels.push(result);
      }
    });
  }

  requireDocker() {
    return this.labels.some((label) => { return label.schema === SCHEME_DOCKER; });
  }

  pickPlatform(runsOn: string[]) {
    const platforms = new Map();
    this.labels.forEach((label) => {
      switch (label.schema) {
        case SCHEME_DOCKER:
          platforms.set(label.name, label.rest.startsWith('//') ? label.rest.slice(2) : label.rest);
          break;
        case SCHEME_HOST:
          platforms.set(label.name, '-self-hosted');
          break;
        default:
      }
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const run of runsOn) {
      if (platforms.has(run)) {
        return platforms.get(run);
      }
    }

    // TODO: support multiple labels
    // like:
    //   ["ubuntu-22.04"] => "ubuntu:22.04"
    //   ["with-gpu"] => "linux:with-gpu"
    //   ["ubuntu-22.04", "with-gpu"] => "ubuntu:22.04_with-gpu"

    // return default.
    // So the runner receives a task with a label that the runner doesn't have,
    // it happens when the user have edited the label of the runner in the web UI.
    // TODO: it may be not correct, what if the runner is used as host mode only?
    return 'gitea/runner-images:ubuntu-latest';
  }

  names() {
    return this.labels.map((label) => { return label.name; });
  }

  push(label: Label) {
    this.labels.push(label);
  }

  toStrings() {
    return this.labels.map((label) => {
      let str = label.name;
      if (label.schema) {
        str += `:${label.schema}`;
        if (label.rest) {
          str += `:${label.rest}`;
        }
      }
      return str;
    });
  }

  static Parse(str: string | Label) {
    if (typeof str === 'object') {
      return str;
    }
    const [name, schema = SCHEME_DOCKER, ...rest] = str.split(':');
    const label: Label = {
      name,
      schema,
      rest: rest.join(':'),
    };
    if (label.schema !== SCHEME_HOST && label.schema !== SCHEME_DOCKER) {
      throw new Error(`unsupported schema: ${label.schema}`);
    }
    return label;
  }
}

export default Labels;
