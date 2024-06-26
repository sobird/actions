import Expression from '@/pkg/expression';

type Run = {
  shell: 'unspecified' | 'bash' | 'pwsh' | 'python' | 'sh' | 'cmd' | 'powershell';
  'working-directory': string;
};

export interface DefaultsProps {
  run?: Run;
}

class Defaults {
  run: Expression<Run | undefined>;

  constructor(defaults: DefaultsProps = {}) {
    this.run = new Expression(defaults.run, ['github', 'needs', 'strategy', 'matrix', 'env', 'vars', 'inputs']);
  }
}

export default Defaults;
