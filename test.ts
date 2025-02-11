import { IssueMatchersConfig, IssueMatcher } from './pkg/runner/action/command/IssueMatcher';

const config = new IssueMatchersConfig({
  problemMatcher: [
    {
      owner: 'myMatcher',
      severity: 'warning',
      pattern: [
        {
          regexp: '^(ERROR)?(?: )?(.+):$',
          severity: 1,
          code: 2,
        },
        {
          regexp: '^(.+)$',
          message: 1,
        },
      ],
    },
  ],
} as IssueMatchersConfig);

config.validate();
const matcher = new IssueMatcher(config.problemMatcher[0]);

let match = matcher.match('ABC:');
match = matcher.match('not-working');

// expect(match.severity).toBe('warning');
// expect(match.code).toBe('ABC');
// expect(match.message).toBe('not-working');

match = matcher.match('ERROR ABC:');
match = matcher.match('not-working')!;
expect(match.severity).toBe('ERROR');
expect(match.code).toBe('ABC');
expect(match.message).toBe('not-working');
