export class Input {
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
  default?: string;

  /**
   * **Optional** If the input parameter is used, this string is logged as a warning message.
   * You can use this warning to notify users that the input is deprecated and mention any alternatives.
   */
  deprecationMessage?: string;

  constructor(input: Input) {
    this.description = input.description;
    this.required = input.required;
    this.default = input.default;
    this.deprecationMessage = input.deprecationMessage;
  }
}

export function inputs(nodes?: Record<string, Input>) {
  if (!nodes) {
    return;
  }
  return Object.fromEntries(Object.entries(nodes).map(([inputId, input]) => {
    return [inputId, new Input(input)];
  }));
}
