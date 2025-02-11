/* eslint-disable max-classes-per-file */
// https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md
function getNumberOfGroups(regex: RegExp) {
  // 匹配普通分组 ( )，排除非捕获组 (?: ) 和其他特殊语法
  const groupPattern = /\((?!\?)/g;
  const matches = regex.source.match(groupPattern);

  return matches ? matches.length : 0;
}

export class IssuePattern {
  public regexp: RegExp;

  public file?: number;

  public line?: number;

  public column?: number;

  public severity?: number;

  public code?: number;

  public message?: number;

  public fromPath?: number;

  public loop: boolean;

  constructor(config: IssuePatternConfig) {
    this.file = config.file;
    this.line = config.line;
    this.column = config.column;
    this.severity = config.severity;
    this.code = config.code;
    this.message = config.message;
    this.fromPath = config.fromPath;
    this.loop = config.loop;
    this.regexp = new RegExp(config.regexp || '');
  }
}

class IssueMatch {
  file?: string;

  line?: string;

  column?: string;

  severity?: string;

  code?: string;

  message?: string;

  fromPath?: string;

  constructor(runningMatch: IssueMatch | null, pattern: IssuePattern, groups: RegExpMatchArray, defaultSeverity: string | null = null) {
    this.file = runningMatch?.file || IssueMatch.GetValue(groups, pattern.file);
    this.line = runningMatch?.line || IssueMatch.GetValue(groups, pattern.line);
    this.column = runningMatch?.column || IssueMatch.GetValue(groups, pattern.column);
    this.severity = runningMatch?.severity || IssueMatch.GetValue(groups, pattern.severity);
    this.code = runningMatch?.code || IssueMatch.GetValue(groups, pattern.code);
    this.message = runningMatch?.message || IssueMatch.GetValue(groups, pattern.message);
    this.fromPath = runningMatch?.fromPath || IssueMatch.GetValue(groups, pattern.fromPath);

    if (!this.severity && defaultSeverity) {
      this.severity = defaultSeverity;
    }
  }

  static GetValue(groups: RegExpMatchArray, index?: number) {
    if (index && index < groups.length) {
      return groups[index];
    }
  }
}

export class IssueMatcher {
  public defaultSeverity: string = '';

  owner: string = '';

  pattern: IssuePattern[] = [];

  state: Array<IssueMatch | null> = [];

  constructor(config: IssueMatcherConfig) {
    this.owner = config.owner;
    this.defaultSeverity = config.severity;
    this.pattern = config.pattern.map((x) => { return new IssuePattern(x); });
    this.reset();
  }

  match(line: string) {
    // Single pattern
    if (this.pattern.length === 1) {
      const pattern = this.pattern[0];
      const regexMatch = pattern.regexp.exec(line);

      if (regexMatch) {
        return new IssueMatch(null, pattern, regexMatch, this.defaultSeverity);
      }
    }
    // Multiple pattern
    // Each pattern (iterate in reverse)
    for (let i = this.pattern.length - 1; i >= 0; i--) {
      const runningMatch = i > 0 ? this.state[i - 1] : null;

      // First pattern or a running match
      if (i === 0 || runningMatch) {
        const pattern = this.pattern[i];
        const isLast = i === this.pattern.length - 1;
        const regexMatch = pattern.regexp.exec(line);

        // Matched
        if (regexMatch) {
          // Last pattern
          if (isLast) {
            // Loop
            if (pattern.loop) {
              // Clear most state, but preserve the running match
              this.reset();
              this.state[i - 1] = runningMatch;
            } else {
              this.reset();
            }
            return new IssueMatch(runningMatch, pattern, regexMatch, this.defaultSeverity);
          }
          // Not the last pattern
          // Store the match
          this.state[i] = new IssueMatch(runningMatch, pattern, regexMatch);
        } else if (isLast) { // Last pattern
          // Break the running match
          this.state[i - 1] = null;
        } else { // Not the last pattern
          // Record not matched
          this.state[i] = null;
        }
      }
    }
  }

  reset() {
    this.state = new Array(this.pattern.length - 1).fill(null);
  }
}

export class IssuePatternConfig {
  /**
   * the regex pattern that provides the groups to match against **required**
   */
  regexp: string = '';

  /**
   * a group number containing the file name
   */
  file?: number;

  /**
   * a group number containing a filepath used to root the file (e.g. a project file)
   */
  fromPath?: number;

  /**
   * a group number containing the line number
   */
  line?: number;

  /**
   * a group number containing the column information
   */
  column?: number;

  /**
   * a group number containing either 'warning' or 'error' case-insensitive. Defaults to `error`
   */
  severity?: number;

  /**
   * a group number containing the error code
   */
  code?: number;

  /**
   * a group number containing the error message. **required** at least one pattern must set the message
   */
  message?: number;

  /**
   * whether to loop until a match is not found, only valid on the last pattern of a multipattern matcher
   */
  loop: boolean = false;

  constructor(config: IssuePatternConfig) {
    this.regexp = config.regexp;
    this.file = config.file;
    this.line = config.line;
    this.column = config.column;
    this.severity = config.severity;
    this.code = config.code;
    this.message = config.message;
    this.fromPath = config.fromPath;
    this.loop = config.loop;
  }

  validate(
    isFirst: boolean,
    isLast: boolean,
    validateProps: ValidateProps,
  ): void {
    // Only the last pattern in a multiline matcher may set 'loop'
    if (this.loop && (isFirst || !isLast)) {
      throw new Error('Only the last pattern in a multiline matcher may set \'loop\'');
    }

    if (this.loop && this.message == null) {
      throw new Error('The loop pattern must set \'message\'');
    }

    const regex = new RegExp(this.regexp || '', 'g');
    const groupCount = getNumberOfGroups(regex) + 1;

    IssuePatternConfig.Validate('file', groupCount, this.file, validateProps);
    IssuePatternConfig.Validate('line', groupCount, this.line, validateProps);
    IssuePatternConfig.Validate('column', groupCount, this.column, validateProps);
    IssuePatternConfig.Validate('severity', groupCount, this.severity, validateProps);
    IssuePatternConfig.Validate('code', groupCount, this.code, validateProps);
    IssuePatternConfig.Validate('message', groupCount, this.message, validateProps);
    IssuePatternConfig.Validate('fromPath', groupCount, this.fromPath, validateProps);
  }

  static Validate(propertyName: keyof ValidateProps, groupCount: number, newValue?: number, validateProps?: ValidateProps): void {
    if (!newValue) {
      return;
    }

    // The property '___' is set twice
    if (validateProps?.[propertyName]) {
      throw new Error(`The property '${propertyName}' is set twice`);
    }

    // Out of range
    if (newValue < 0 || newValue >= groupCount) {
      throw new Error(`The property '${propertyName}' is set to ${newValue} which is out of range`);
    }

    // Record the value
    if (newValue && validateProps) {
      // eslint-disable-next-line no-param-reassign
      validateProps[propertyName] = newValue;
    }
  }
}

interface ValidateProps {
  file?: number;
  line?: number;
  column?: number;
  severity?: number;
  code?: number;
  message?: number;
  fromPath?: number;
}

export class IssueMatcherConfig {
  owner: string = '';

  severity: string = '';

  pattern: IssuePatternConfig[] = [];

  constructor(config: IssueMatcherConfig) {
    this.owner = config.owner;
    this.severity = config.severity;
    this.pattern = config.pattern.map((item) => { return new IssuePatternConfig(item); });
  }

  validate(): void {
    // Validate owner
    if (!this.owner) {
      throw new Error('Owner must not be empty');
    }

    // Validate severity
    switch ((this.severity || '').toUpperCase()) {
      case '':
      case 'ERROR':
      case 'WARNING':
      case 'NOTICE':
        break;
      default:
        throw new Error(`Matcher '${this.owner}' contains unexpected default severity '${this.severity}'`);
    }

    // Validate at least one pattern
    if (!this.pattern || this.pattern.length === 0) {
      throw new Error(`Matcher '${this.owner}' does not contain any pattern`);
    }

    const validateProps: ValidateProps = {};

    // Validate each pattern config
    for (let i = 0; i < this.pattern.length; i++) {
      const isFirst = i === 0;
      const isLast = i === this.pattern.length - 1;
      const pattern = this.pattern[i];
      pattern.validate(isFirst, isLast, validateProps);
    }

    if (validateProps.message == null) {
      throw new Error('At least one pattern must set \'message\'');
    }
  }
}

export class IssueMatchersConfig {
  problemMatcher: IssueMatcherConfig[] = [];

  constructor(config: IssueMatchersConfig) {
    this.problemMatcher = config.problemMatcher.map((item) => { return new IssueMatcherConfig(item); });
  }

  // get matchers(): IssueMatcherConfig[] {
  //   if (!this._matchers) {
  //     this._matchers = [];
  //   }
  //   return this._matchers;
  // }

  // set matchers(value: IssueMatcherConfig[]) {
  //   this._matchers = value;
  // }

  validate(): void {
    const distinctOwners = new Set<string>();

    if (this.problemMatcher && this.problemMatcher.length > 0) {
      for (const matcher of this.problemMatcher) {
        matcher.validate();

        const owner = matcher.owner.toLowerCase();

        if (distinctOwners.has(owner)) {
          throw new Error(`Duplicate owner name '${matcher.owner}'`);
        }
        distinctOwners.add(owner);
      }
    }
  }
}
