//  the base directory of the remotes information of git.
const RemotePrefix = 'refs/remotes/';
// the base directory of the pull information of git.
const PullPrefix = 'refs/pull/';
// base directory of the branch information file store on git
const BranchPrefix = 'refs/heads/';
// tags prefix path on the repository
const TagPrefix = 'refs/tags/';

/**
 * ForPrefix special ref to create a pull request: `refs/for/<target-branch>/<topic-branch>`
 * or `refs/for/<targe-branch> -o topic='<topic-branch>'`
 */
const ForPrefix = 'refs/for/';

class Ref {
  constructor(public name: string) {}

  isBranch() {
    return this.name.startsWith(BranchPrefix);
  }

  isTag() {
    return this.name.startsWith(TagPrefix);
  }

  isRemote() {
    return this.name.startsWith(RemotePrefix);
  }

  isPull() {
    return this.name.startsWith(PullPrefix);
  }

  isFor() {
    return this.name.startsWith(ForPrefix);
  }

  nameWithoutPrefix(prefix: string) {
    if (this.name.startsWith(prefix)) {
      return this.name.substring(prefix.length);
    }
    return '';
  }

  tagName() {
    return this.nameWithoutPrefix(TagPrefix);
  }

  branchName() {
    return this.nameWithoutPrefix(BranchPrefix);
  }

  // returns the pull request name part of refs like refs/pull/<pull_name>/head
  pullName() {
    const lastIdx = this.name.lastIndexOf('/');
    if (this.name.startsWith(PullPrefix) && lastIdx > -1) {
      return this.name.substring(PullPrefix.length, lastIdx);
    }
    return '';
  }

  // returns the branch name part of refs like refs/for/<branch_name>
  forBranchName() {
    return this.nameWithoutPrefix(ForPrefix);
  }

  remoteName() {
    return this.nameWithoutPrefix(RemotePrefix);
  }

  shortName() {
    if (this.isBranch()) {
      return this.nameWithoutPrefix(BranchPrefix);
    } if (this.isTag()) {
      return this.nameWithoutPrefix(TagPrefix);
    } if (this.isRemote()) {
      return this.nameWithoutPrefix(RemotePrefix);
    } if (this.isPull()) {
      return this.pullName();
    } if (this.isFor()) {
      return this.forBranchName();
    }
    return this.name;
  }

  group() {
    if (this.isBranch()) {
      return 'heads';
    } if (this.isTag()) {
      return 'tags';
    } if (this.isRemote()) {
      return 'remotes';
    } if (this.isPull()) {
      return 'pull';
    } if (this.isFor()) {
      return 'for';
    }
    return '';
  }

  type() {
    if (this.isBranch()) {
      return 'branch';
    } if (this.isTag()) {
      return 'tag';
    }
    return '';
  }

  toString() {
    return this.name;
  }

  static fromBranch(shortName: string) {
    return new this(BranchPrefix + shortName);
  }

  static fromTag(shortName: string) {
    return new this(TagPrefix + shortName);
  }

  static URL(repoURL: string, ref: string) {
    const refFullName = new this(ref);
    const refName = (refFullName.shortName());
    switch (true) {
      case refFullName.isBranch():
        return `${repoURL}/src/branch/${refName}`;
      case refFullName.isTag():
        return `${repoURL}/src/tag/${refName}`;
      case !/^[0-9a-f]{4,40}$/.test(ref): // Simple SHA1 validation
        // assume they mean a branch
        return `${repoURL}/src/branch/${refName}`;
      default:
        return `${repoURL}/src/commit/${refName}`;
    }
  }
}

export default Ref;
