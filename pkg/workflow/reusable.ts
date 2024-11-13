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

  constructor(public uses: string = '', public token: string = '') {
    if (this.isLocal) {
      this.path = uses;
      return;
    }

    // http(s)://host/{owner}/{repo}/{path}@{ref}
    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);

    if (matches) {
      const [,url, owner = '', repo = '', path = '', ref = ''] = matches;
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
      const url = new URL(this.repository, this.url);

      if (this.token) {
        url.username = 'token';
        url.password = this.token;
      }

      return url.toString();
    } catch (err) {
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
