import Expression from '@/pkg/expression';

export interface InputProps extends Pick<Input, 'description' | 'required' | 'deprecationMessage' > {
  default: string;
}

export default class Input {
  /**
   * **Required** A string description of the input parameter.
   */
  description: string;

  /**
   * **Optional** A boolean to indicate whether the action requires the input parameter.
   * Set to true when the parameter is required.
   */
  required?: boolean;

  /**
   * **Optional** A string representing the default value. The default value is used when an input parameter isn't specified in a workflow file.
   */
  default: Expression<InputProps['default']>;

  /**
   * **Optional** If the input parameter is used, this string is logged as a warning message.
   * You can use this warning to notify users that the input is deprecated and mention any alternatives.
   */
  deprecationMessage?: string;

  constructor(input: InputProps) {
    this.description = input.description;
    this.required = input.required;
    this.default = new Expression(
      input.default,
      ['github', 'needs', 'vars', 'inputs'],
      ['always', 'cancelled', 'success', 'failure'],
      '',
    );
    this.deprecationMessage = input.deprecationMessage;
  }

  static inputs(inputs?: Record<string, InputProps>) {
    if (!inputs) {
      return;
    }
    return Object.fromEntries(Object.entries(inputs).map(([inputId, input]) => {
      return [inputId, new Input(input)];
    }));
  }
}
