/* eslint-disable max-classes-per-file */
class MatcherChangedEventArgs {
  constructor(public config: IssueMatcherConfig) {}
}

class IssuePattern {
  public file?: number;

  public line?: number;

  public column?: number;

  public severity?: number;

  public code?: number;

  public message?: number;

  public fromPath?: number;

  public loop: boolean;

  public regex: RegExp;

  constructor(config: IssuePatternConfig) {
    this.file = config.file;
    this.line = config.line;
    this.column = config.column;
    this.severity = config.severity;
    this.code = config.code;
    this.message = config.message;
    this.fromPath = config.fromPath;
    this.loop = config.loop;
    this.regex = new RegExp(config.pattern || '', 'g');
  }
}

export class IssueMatcher {
  #defaultSeverity: string;

  #owner: string;

  #pattern: IssuePattern[];

  #state: IssueMatch[] = [];

  constructor(config: IssueMatcherConfig, timeout: number) {
    this.#owner = config.owner;
    this.#defaultSeverity = config.severity;
    this.#pattern = config.pattern.map((x) => { return new IssuePattern(x, timeout); });
    this.reset();
  }

  get owner(): string {
    return this.#owner || '';
  }

  get defaultSeverity(): string {
    return this.#defaultSeverity || '';
  }

  match(line: string): IssueMatch | null {
    // Single pattern
    if (this.#pattern.length === 1) {
      const pattern = this.#pattern[0];
      const regexMatch = pattern.regex.exec(line);

      if (regexMatch) {
        return new IssueMatch(null, pattern, regexMatch, this.defaultSeverity);
      }

      return null;
    }
    // Multiple pattern

    // Each pattern (iterate in reverse)
    for (let i = this.#pattern.length - 1; i >= 0; i--) {
      const runningMatch = i > 0 ? this.#state[i - 1] : null;

      // First pattern or a running match
      if (i === 0 || runningMatch) {
        const pattern = this.#pattern[i];
        const isLast = i === this.#pattern.length - 1;
        const regexMatch = pattern.regex.exec(line);

        // Matched
        if (regexMatch) {
          // Last pattern
          if (isLast) {
            // Loop
            if (pattern.loop) {
              // Clear most state, but preserve the running match
              this.reset();
              this.#state[i - 1] = runningMatch;
            }
            // Not loop
            else {
              // Clear the state
              this.reset();
            }

            // Return
            return new IssueMatch(runningMatch, pattern, regexMatch, this.defaultSeverity);
          }
          // Not the last pattern

          // Store the match
          this.#state[i] = new IssueMatch(runningMatch, pattern, regexMatch);
        }
        // Not matched
        else {
          // Last pattern
          if (isLast) {
            // Break the running match
            this.#state[i - 1] = null;
          }
          // Not the last pattern
          else {
            // Record not matched
            this.#state[i] = null;
          }
        }
      }
    }

    return null;
  }

  reset(): void {
    this.#state = new Array(this.#pattern.length - 1);
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

export class IssueMatchersConfig {
  constructor(public matchers: IssueMatcherConfig[] = []) {}

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

    if (this.matchers && this.matchers.length > 0) {
      for (const matcher of this.matchers) {
        matcher.validate();

        if (distinctOwners.has(matcher.owner)) {
          throw new Error(`Duplicate owner name '${matcher.owner}'`);
        }
        distinctOwners.add(matcher.owner);
      }
    }
  }
}

class IssueMatcherConfig {
  #owner: string = '';

  #severity: string = '';

  #pattern: IssuePatternConfig[] = [];

  get owner(): string {
    return this.#owner;
  }

  set owner(value: string) {
    this.#owner = value;
  }

  get severity(): string {
    return this.#severity;
  }

  set severity(value: string) {
    this.#severity = value;
  }

  get pattern(): IssuePatternConfig[] {
    return this.#pattern || [];
  }

  set pattern(value: IssuePatternConfig[]) {
    this.#pattern = value;
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

    const file: number | null = null;
    const line: number | null = null;
    const column: number | null = null;
    const severity: number | null = null;
    const code: number | null = null;
    const message: number | null = null;
    const fromPath: number | null = null;

    // Validate each pattern config
    for (let i = 0; i < this.pattern.length; i++) {
      const isFirst = i === 0;
      const isLast = i === this.pattern.length - 1;
      const pattern = this.pattern[i];
      pattern.validate(isFirst, isLast, file, line, column, severity, code, message, fromPath);
    }

    if (message == null) {
      throw new Error('At least one pattern must set \'message\'');
    }
  }
}

class IssuePatternConfig {
  file: number | null = null;

  line: number | null = null;

  column: number | null = null;

  severity: number | null = null;

  code: number | null = null;

  message: number | null = null;

  fromPath: number | null = null;

  loop: boolean = false;

  pattern: string | null = null;

  validate(
    isFirst: boolean,
    isLast: boolean,
    file: number | null,
    line: number | null,
    column: number | null,
    severity: number | null,
    code: number | null,
    message: number | null,
    fromPath: number | null,
  ): void {
    // Only the last pattern in a multiline matcher may set 'loop'
    if (this.loop && (isFirst || !isLast)) {
      throw new Error('Only the last pattern in a multiline matcher may set \'loop\'');
    }

    if (this.loop && this.message == null) {
      throw new Error('The loop pattern must set \'message\'');
    }

    const regex = new RegExp(this.pattern || '', 'g');
    const groupCount = regex.toString().split('|').length;

    IssuePatternConfig.Validate('file', groupCount, this.file, file);
    IssuePatternConfig.Validate('line', groupCount, this.line, line);
    IssuePatternConfig.Validate('column', groupCount, this.column, column);
    IssuePatternConfig.Validate('severity', groupCount, this.severity, severity);
    IssuePatternConfig.Validate('code', groupCount, this.code, code);
    IssuePatternConfig.Validate('message', groupCount, this.message, message);
    IssuePatternConfig.Validate('fromPath', groupCount, this.fromPath, fromPath);
  }

  static Validate(propertyName: string, groupCount: number, newValue: number | null, trackedValue: number | null): void {
    if (newValue == null) {
      return;
    }

    // The property '___' is set twice
    if (trackedValue != null) {
      throw new Error(`The property '${propertyName}' is set twice`);
    }

    // Out of range
    if (newValue < 0 || newValue >= groupCount) {
      throw new Error(`The property '${propertyName}' is set to ${newValue} which is out of range`);
    }

    // Record the value
    if (newValue != null) {
      trackedValue = newValue;
    }
  }
}
