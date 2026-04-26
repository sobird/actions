/**
 * Runner Labels
 *
 * [label]=[image]
 * ubuntu-latest=actions/runner-images:ubuntu-latest
 *
 * sobird<i@sobird.me> at 2024/04/24 18:59:14 created.
 */

export const SELF_HOSTED = '-self-hosted';

interface Platform {
  label: string;
  image: string;
}

class Labels {
  platforms = new Map<string, string>();

  constructor(platforms: string[] = []) {
    platforms.forEach((platform) => {
      const { label, image } = Labels.Parse(platform);
      this.platforms.set(label, image);
    });
  }

  requireDocker() {
    return [...this.platforms.values()].some((image) => { return image !== SELF_HOSTED; });
  }

  pickPlatform(runsOn: string[]) {
    const { platforms } = this;

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
    return [...this.platforms.keys()];
  }

  toStrings() {
    return [...this.platforms.entries()].map((platform) => {
      return platform.join('=');
    });
  }

  static Parse(string: string) {
    const [label, image] = string.split('=');
    const platform: Platform = {
      label,
      // schema: image === '-self-hosted' ? SCHEME_HOST : SCHEME_DOCKER,
      image,
    };
    // if (platform.schema !== SCHEME_HOST && platform.schema !== SCHEME_DOCKER) {
    //   throw new Error(`unsupported schema: ${platform.schema}`);
    // }
    return platform;
  }
}

export default Labels;
