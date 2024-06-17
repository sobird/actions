export class Output {
  /**
   * Required A string description of the output parameter.
   */
  description: string;

  /**
   * Required The value that the output parameter will be mapped to.
   * You can set this to a string or an expression with context.
   * For example, you can use the steps context to set the value of an output to the output value of a step.
   */
  value: unknown;

  constructor(output: Output) {
    this.description = output.description;
    this.value = output.value;
  }
}

export function outputs(nodes?: Record<string, Output>) {
  if (!nodes) {
    return;
  }
  return Object.fromEntries(Object.entries(nodes).map(([inputId, input]) => {
    return [inputId, new Output(input)];
  }));
}
