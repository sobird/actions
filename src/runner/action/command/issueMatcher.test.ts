import { IssueMatchersConfig, IssuePatternConfig, IssueMatcher } from './issueMatcher';

describe('Issue Matchers Config Validation', () => {
  it('should throw an error if loop is set on a single pattern', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^error: (.+)$',
              message: 1,
              loop: true,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();

    config.problemMatcher[0].pattern = [new IssuePatternConfig({
      regexp: '^file: (.+)$',
      message: 1,
    } as IssuePatternConfig)];

    config.validate();
  });

  it('should throw an error if loop is not on the last pattern', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(error)$',
              severity: 1,
            },
            {
              regexp: '^file: (.+)$',
              file: 1,
              loop: true,
            },
            {
              regexp: '^error: (.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);
    expect(() => { return config.validate(); }).toThrow();

    // Sanity test
    config.problemMatcher[0].pattern[1].loop = false;
    config.problemMatcher[0].pattern[2].loop = true;
    config.validate();
  });

  it('should throw an error if loop is set without message', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file: (.+)$',
              message: 1,
            },
            {
              regexp: '^file: (.+)$',
              file: 1,
              loop: true,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);
    expect(() => { return config.validate(); }).toThrow();

    config.problemMatcher[0].pattern[1].loop = false;
    config.validate();
  });

  it('should allow message in the first pattern', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file: (.+)$',
              message: 1,
            },
            {
              regexp: '^error: (.+)$',
              file: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).not.toThrow();
  });

  it('should require message property', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^error: (.+)$',
              file: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();

    // Sanity test
    config.problemMatcher[0].pattern[0].file = undefined;
    config.problemMatcher[0].pattern[0].message = 1;
    config.validate();
  });

  it('should ensure owner is distinct', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^error: (.+)$',
              message: 1,
            },
          ],
        },
        {
          owner: 'MYmatcher',
          pattern: [
            {
              regexp: '^ERR: (.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow(Error);

    // Sanity test
    config.problemMatcher[0].owner = 'asdf';
    config.validate();
  });

  it('should require owner property', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: '',
          pattern: [
            {
              regexp: '^error: (.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();

    // Sanity test
    config.problemMatcher[0].owner = 'asdf';
    config.validate();
  });

  it('should require pattern property', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [],
        },
      ],
    } as unknown as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();

    // Sanity test
    config.problemMatcher[0].pattern = [new IssuePatternConfig({
      regexp: '^error: (.+)$',
      message: 1,
    } as IssuePatternConfig)];
    config.validate();
  });

  it('should throw an error if a property is set twice', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^severity: (.+)$',
              file: 1,
            },
            {
              regexp: '^file: (.+)$',
              file: 1,
            },
            {
              regexp: '^(.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();
    // Sanity test
    config.problemMatcher[0].pattern[0].file = undefined;
    config.problemMatcher[0].pattern[0].severity = 1;
    config.validate();
  });

  it('should throw an error if a property is out of range', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              message: 2,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();

    // Sanity test
    config.problemMatcher[0].pattern[0].message = 1;
    config.validate();
  });

  it('should throw an error if a property is less than zero', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              message: -1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    expect(() => { return config.validate(); }).toThrow();
    // Sanity test
    config.problemMatcher[0].pattern[0].message = 1;
    config.validate();
  });
});

describe('IssueMatcher Functionality', () => {
  it('should set default severity for multiple patterns', () => {
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
    match = matcher.match('not-working')!;

    expect(match.severity).toBe('warning');
    expect(match.code).toBe('ABC');
    expect(match.message).toBe('not-working');

    match = matcher.match('ERROR ABC:');
    match = matcher.match('not-working')!;
    expect(match.severity).toBe('ERROR');
    expect(match.code).toBe('ABC');
    expect(match.message).toBe('not-working');
  });

  it('should set default severity to notice', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          severity: 'notice',
          pattern: [
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

    const match = matcher.match('just-a-notice')!;
    expect(match.severity).toBe('notice');
    expect(match.message).toBe('just-a-notice');
  });

  it('should accumulate state per line for loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              file: 1,
            },
            {
              regexp: '^(.+)$',
              code: 1,
            },
            {
              regexp: '^message:(.+)$',
              message: 1,
              loop: true,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('file1');
    expect(match).toBeUndefined();
    match = matcher.match('code1');
    expect(match).toBeUndefined();
    match = matcher.match('message:message1')!;
    expect(match.file).toBe('file1');
    expect(match.code).toBe('code1');
    expect(match.message).toBe('message1');
    match = matcher.match('message:message1-2')!; // sanity check loop
    expect(match.file).toBe('file1');
    expect(match.code).toBe('code1');
    expect(match.message).toBe('message1-2');
    match = matcher.match('abc'); // discarded
    expect(match).toBeUndefined();
    match = matcher.match('file2');
    expect(match).toBeUndefined();
    match = matcher.match('code2');
    expect(match).toBeUndefined();
    match = matcher.match('message:message2')!;
    expect(match.file).toBe('file2');
    expect(match.code).toBe('code2');
    expect(match.message).toBe('message2');

    match = matcher.match('abc'); // discarded
    match = matcher.match('abc'); // discarded
    match = matcher.match('file3');
    expect(match).toBeUndefined();
    match = matcher.match('code3');
    expect(match).toBeUndefined();
    match = matcher.match('message:message3')!;
    expect(match.file).toBe('file3');
    expect(match.code).toBe('code3');
    expect(match.message).toBe('message3');
  });

  it('should clear state on broken match for loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              file: 1,
            },
            {
              regexp: '^(.+)$',
              severity: 1,
            },
            {
              regexp: '^message:(.+)$',
              message: 1,
              loop: true,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('my-file.cs'); // file
    expect(match).toBeUndefined();
    match = matcher.match('real-bad'); // severity
    expect(match).toBeUndefined();
    match = matcher.match('message:not-working')!; // message
    expect(match.file).toBe('my-file.cs');
    expect(match.severity).toBe('real-bad');
    expect(match.message).toBe('not-working');
    match = matcher.match('message:problem')!; // message
    expect(match.file).toBe('my-file.cs');
    expect(match.severity).toBe('real-bad');
    expect(match.message).toBe('problem');
    match = matcher.match('other-file.cs'); // file - breaks the loop
    expect(match).toBeUndefined();
    match = matcher.match('message:not-good'); // severity - also matches the message pattern
    expect(match).toBeUndefined(); // ensures previous state is cleared
    match = matcher.match('message:broken')!; // message
    expect(match.file).toBe('other-file.cs');
    expect(match.severity).toBe('message:not-good');
    expect(match.message).toBe('broken');
  });

  it('should extract properties for loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file:(.+) fromPath:(.+)$',
              file: 1,
              fromPath: 2,
            },
            {
              regexp: '^severity:(.+)$',
              severity: 1,
            },
            {
              regexp: '^line:(.+) column:(.+) code:(.+) message:(.+)$',
              line: 1,
              column: 2,
              code: 3,
              message: 4,
              loop: true,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('file:my-file.cs fromPath:my-project.proj');
    expect(match).toBeUndefined();
    match = matcher.match('severity:real-bad');
    expect(match).toBeUndefined();
    match = matcher.match('line:123 column:45 code:uh-oh message:not-working')!;
    expect(match.file).toBe('my-file.cs');
    expect(match.fromPath).toBe('my-project.proj');
    expect(match.severity).toBe('real-bad');
    expect(match.line).toBe('123');
    expect(match.column).toBe('45');
    expect(match.code).toBe('uh-oh');
    expect(match.message).toBe('not-working');
    match = matcher.match('line:234 column:56 code:yikes message:broken')!;
    expect(match.file).toBe('my-file.cs');
    expect(match.fromPath).toBe('my-project.proj');
    expect(match.severity).toBe('real-bad');
    expect(match.line).toBe('234');
    expect(match.column).toBe('56');
    expect(match.code).toBe('yikes');
    expect(match.message).toBe('broken');
    match = matcher.match('line:345 column:67 code:failed message:cant-do-that')!;
    expect(match.file).toBe('my-file.cs');
    expect(match.fromPath).toBe('my-project.proj');
    expect(match.severity).toBe('real-bad');
    expect(match.line).toBe('345');
    expect(match.column).toBe('67');
    expect(match.code).toBe('failed');
    expect(match.message).toBe('cant-do-that');
  });

  it('should accumulate state per line for non-loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              file: 1,
            },
            {
              regexp: '^(.+)$',
              code: 1,
            },
            {
              regexp: '^message:(.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('file1');
    expect(match).toBeUndefined();
    match = matcher.match('code1');
    expect(match).toBeUndefined();
    match = matcher.match('message:message1')!;
    expect(match.file).toBe('file1');
    expect(match.code).toBe('code1');
    expect(match.message).toBe('message1');
    match = matcher.match('abc'); // discarded
    expect(match).toBeUndefined();
    match = matcher.match('file2');
    expect(match).toBeUndefined();
    match = matcher.match('code2');
    expect(match).toBeUndefined();
    match = matcher.match('message:message2')!;
    expect(match.file).toBe('file2');
    expect(match.code).toBe('code2');
    expect(match.message).toBe('message2');
    match = matcher.match('abc'); // discarded
    expect(match).toBeUndefined();
    match = matcher.match('abc'); // discarded
    expect(match).toBeUndefined();
    match = matcher.match('file3');
    expect(match).toBeUndefined();
    match = matcher.match('code3');
    expect(match).toBeUndefined();
    match = matcher.match('message:message3')!;
    expect(match.file).toBe('file3');
    expect(match.code).toBe('code3');
    expect(match.message).toBe('message3');
    match = matcher.match('message:message3'); // sanity check not loop
    expect(match).toBeUndefined();
  });

  it('should not loop for non-loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file:(.+)$',
              file: 1,
            },
            {
              regexp: '^message:(.+)$',
              message: 1,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('file:my-file.cs');
    expect(match).toBeUndefined();
    match = matcher.match('message:not-working')!;
    expect(match.file).toBe('my-file.cs');
    expect(match.message).toBe('not-working');
    match = matcher.match('message:not-working');
    expect(match).toBeUndefined();
  });

  it('should extract properties for non-loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file:(.+) fromPath:(.+)$',
              file: 1,
              fromPath: 2,
            },
            {
              regexp: '^severity:(.+)$',
              severity: 1,
            },
            {
              regexp: '^line:(.+) column:(.+) code:(.+) message:(.+)$',
              line: 1,
              column: 2,
              code: 3,
              message: 4,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('file:my-file.cs fromPath:my-project.proj');
    expect(match).toBeUndefined();
    match = matcher.match('severity:real-bad');
    expect(match).toBeUndefined();
    match = matcher.match('line:123 column:45 code:uh-oh message:not-working')!;
    expect(match.file).toBe('my-file.cs');
    expect(match.fromPath).toBe('my-project.proj');
    expect(match.severity).toBe('real-bad');
    expect(match.line).toBe('123');
    expect(match.column).toBe('45');
    expect(match.code).toBe('uh-oh');
    expect(match.message).toBe('not-working');
    match = matcher.match('line:123 column:45 code:uh-oh message:not-working'); // sanity check not loop
    expect(match).toBeUndefined();
  });

  it('should clear state on match for non-loop patterns', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^(.+)$',
              file: 1,
            },
            {
              regexp: '^(.+)$',
              severity: 1,
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

    let match = matcher.match('my-file.cs'); // file
    expect(match).toBeUndefined();
    match = matcher.match('real-bad'); // severity
    expect(match).toBeUndefined();
    match = matcher.match('not-working')!; // message
    expect(match.file).toBe('my-file.cs');
    expect(match.severity).toBe('real-bad');
    expect(match.message).toBe('not-working');
    match = matcher.match('other-file.cs'); // file
    expect(match).toBeUndefined();
    match = matcher.match('not-good'); // severity
    expect(match).toBeUndefined();
    match = matcher.match('broken')!; // message
    expect(match.file).toBe('other-file.cs');
    expect(match.severity).toBe('not-good');
    expect(match.message).toBe('broken');
  });

  it('should set owner', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
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
    expect(matcher.owner).toBe('myMatcher');
  });

  it('should set default severity for single pattern', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          severity: 'warning',
          pattern: [
            {
              regexp: '^(ERROR)?(?: )?(.+): (.+)$',
              severity: 1,
              code: 2,
              message: 3,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    let match = matcher.match('ABC: not-working')!;
    expect(match.severity).toBe('warning');
    expect(match.code).toBe('ABC');
    expect(match.message).toBe('not-working');

    match = matcher.match('ERROR ABC: not-working')!;
    expect(match.severity).toBe('ERROR');
    expect(match.code).toBe('ABC');
    expect(match.message).toBe('not-working');
  });

  it('should extract properties for single pattern', () => {
    const config = new IssueMatchersConfig({
      problemMatcher: [
        {
          owner: 'myMatcher',
          pattern: [
            {
              regexp: '^file:(.+) line:(.+) column:(.+) severity:(.+) code:(.+) message:(.+) fromPath:(.+)$',
              file: 1,
              line: 2,
              column: 3,
              severity: 4,
              code: 5,
              message: 6,
              fromPath: 7,
            },
          ],
        },
      ],
    } as IssueMatchersConfig);

    config.validate();
    const matcher = new IssueMatcher(config.problemMatcher[0]);

    const match = matcher.match(
      'file:my-file.cs line:123 column:45 severity:real-bad code:uh-oh message:not-working fromPath:my-project.proj',
    )!;
    expect(match.file).toBe('my-file.cs');
    expect(match.line).toBe('123');
    expect(match.column).toBe('45');
    expect(match.severity).toBe('real-bad');
    expect(match.code).toBe('uh-oh');
    expect(match.message).toBe('not-working');
    expect(match.fromPath).toBe('my-project.proj');
  });
});
