import Expression from '@/pkg/expression';

export interface EnvironmentOptions {
  name?: string;
  url?: string;
}

class Environment {
  name: Expression<string | undefined>;

  url: Expression<string | undefined>;

  constructor(environment: EnvironmentOptions = {}) {
    let env: EnvironmentOptions = { };

    if (typeof environment === 'string') {
      env.name = environment;
    } else {
      env = environment;
    }

    this.name = new Expression(env.name, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
    this.url = new Expression(env.url, ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'steps', 'inputs']);
  }
}

export default Environment;
