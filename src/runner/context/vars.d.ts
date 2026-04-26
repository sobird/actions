/**
 * Note: Configuration variables for GitHub Actions are in beta and subject to change.
 *
 * The vars context contains custom configuration variables set at the organization, repository, and environment levels.
 * For more information about defining configuration variables for use in multiple workflows, see "{@link https://docs.github.com/en/actions/learn-github-actions/variables#defining-variables-for-multiple-workflows Variables}".
 */
export type Vars = Record<string, string>;
