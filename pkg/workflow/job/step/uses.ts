import path from 'node:path';

/**
 * Selects an action to run as part of a step in your job. An action is a reusable unit of code.
 * You can use an action defined in the same repository as the workflow, a public repository, or in a {@link https://hub.docker.com/ published Docker container image}.
 *
 * We strongly recommend that you include the version of the action you are using by specifying a Git ref, SHA, or Docker tag.
 * If you don't specify a version, it could break your workflows or cause unexpected behavior when the action owner publishes an update.
 *
 * * Using the commit SHA of a released action version is the safest for stability and security.
 * * If the action publishes major version tags, you should expect to receive critical fixes and security patches while still retaining compatibility. Note that this behavior is at the discretion of the action's author.
 * * Using the default branch of an action may be convenient, but if someone releases a new major version with a breaking change, your workflow could break.
 *
 * Some actions require inputs that you must set using the {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith with} keyword.
 * Review the action's README file to determine the inputs required.
 *
 * Actions are either JavaScript files or Docker containers.
 * If the action you're using is a Docker container you must run the job in a Linux environment.
 * For more details, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idruns-on runs-on}.
 */
class StepUses {
  #uses;

  #url = '';

  constructor(uses: string) {
    this.#uses = uses;
  }

  executor() {
    let uses = this.#uses;
    if (!uses) {
      return;
    }
    // local
    if (uses.startsWith('./')) {
      uses = uses.substring(2);
      // todo
    }

    // remote
    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);
    if (matches && matches.length === 6) {
      const [,url, owner, repo, dir, ref] = matches;
      this.#url = url;
      this.#repository = path.join(owner, repo);
      this.#dir = dir;
      this.#ref = ref;
    }
  }

  toString() {
    return this.#uses;
  }

  toJSON() {
    return this.#uses;
  }
}

export default StepUses;
