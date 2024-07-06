/* eslint-disable max-classes-per-file */
class Runner {
  static readonly UnsupportedCommandMessageDisabled = 'The %s command is disabled. Please upgrade to using Environment Files or opt into unsecure command execution by setting the `ACTIONS_ALLOW_UNSECURE_COMMANDS` environment variable to `true`. For more information see: https://github.blog/changelog/2020-10-01-github-actions-deprecating-set-env-and-add-path-commands/';
}

class Constants {
  static Runner = Runner;
}

export default Constants;
