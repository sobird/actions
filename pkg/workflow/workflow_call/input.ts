import Expression from '@/pkg/expression';

export interface InputProps extends Pick<Input, 'description' | 'required' | 'type'> {
  default?: string | boolean | number;
}

export default class Input {
  description: string;

  required: boolean;

  default: Expression<InputProps['default']>;

  type: 'boolean' | 'number' | 'string';

  constructor(input: InputProps) {
    this.description = input.description;
    this.required = input.required;
    this.type = input.type;

    let default1: string | boolean | number = '';
    if (this.type === 'string') {
      default1 = input.default || '';
    }

    if (this.type === 'number') {
      default1 = input.default || 0;
    }

    if (this.type === 'boolean') {
      default1 = input.default || false;
    }

    this.default = new Expression(default1, ['github', 'inputs', 'vars']);
  }
}
