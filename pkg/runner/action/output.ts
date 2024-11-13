import Expression from '@/pkg/expression';

export interface OutputProps extends Pick<Output, 'description'> {
  value: string;
}

export default class Output {
  /**
   * Required A string description of the output parameter.
   */
  description: string;

  /**
   * Required The value that the output parameter will be mapped to.
   * You can set this to a string or an expression with context.
   * For example, you can use the steps context to set the value of an output to the output value of a step.
   */
  value: Expression<OutputProps['value']>;

  constructor(output: OutputProps) {
    this.description = output.description;
    this.value = new Expression(
      output.value,
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['always', 'cancelled', 'success', 'failure'],
      'always()',
      true,
    );
  }

  static outputs(outputs?: Record<string, OutputProps>) {
    if (!outputs) {
      return {};
    }
    return Object.fromEntries(Object.entries(outputs).map(([outputId, output]) => {
      return [outputId, new Output(output)];
    }));
  }
}
