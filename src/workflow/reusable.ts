/**
 * Reusable - jobs.<job_id>.uses & jobs.<job_id>.steps[*].uses
 *
 * {url}/{owner}/{repo}/{path}@{ref}
 *
 * sobird<i@sobird.me> at 2024/10/14 11:19:05 created.
 */

export default class Reusable {
  public url: string = '';

  public owner: string = '';

  public repo: string = '';

  public path: string = '';

  public ref: string = '';

  constructor(
    public uses: string = '',
    public token: string = '',
  ) {
    if (this.isLocal) {
      this.path = uses;
      return;
    }

    // a docker:// reference names a container image, so it has no repository, path or ref to parse
    if (this.isDocker) {
      return;
    }

    // http(s)://host/{owner}/{repo}/{path}@{ref}
    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);

    if (matches) {
      const [, url, owner = '', repo = '', path = '', ref] = matches;

      if (!ref) {
        throw new Error(
          `'uses' key references invalid workflow path '${this.uses}'. Must start with './' if it's a local workflow, or must start with '<org>/<repo>/' and include an '@' if it's a remote workflow`,
        );
      }

      this.url = url;
      this.owner = owner;
      this.repo = repo;
      this.path = path;
      this.ref = ref;
    }
  }

  set repository(value: string) {
    const [owner, repo] = value.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  get repository() {
    return `${this.owner}/${this.repo}`;
  }

  get repositoryUrl() {
    try {
      // 凭据不在这里拼进 URL：那会被 `git clone` 落进 `.git/config`，也会被打进日志。
      // 需要认证时由调用方把 `token` 一并交给 Git / ActionCache。
      return new URL(this.repository, this.url).toString();
    } catch {
      return '';
    }
  }

  is(owner: string, repo: string) {
    if (this.owner === owner && this.repo === repo) {
      return true;
    }
    return false;
  }

  get isLocal() {
    return this.uses.startsWith('./');
  }

  get isDocker() {
    return this.uses.startsWith('docker://');
  }

  get isCheckout() {
    return this.is('actions', 'checkout');
  }

  toString() {
    return this.uses;
  }

  toJSON() {
    return this.uses;
  }
}
