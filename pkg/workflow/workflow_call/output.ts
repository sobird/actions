import Expression from '@/pkg/expression';

export interface OutputProps extends Pick<Output, 'description'> {
  value: string;
}

export default class Output {
  description: string;

  value: Expression<OutputProps['value']>;

  constructor(ouput: OutputProps) {
    this.description = ouput.description;
    this.value = new Expression(ouput.value, ['github', 'jobs', 'inputs', 'vars']);
  }
}
