import { type OnEvents } from '../types';
import Input, { InputProps } from './input';
import Output, { OutputProps } from './output';

interface WorkflowCallProps extends Pick<WorkflowCall, 'secrets'> {
  inputs: Record<string, InputProps>;
  outputs: Record<string, OutputProps>;
}

export default class WorkflowCall {
  inputs: Record<string, Input>;

  outputs: Record<string, Output>;

  secrets: OnEvents['workflow_call']['secrets'];

  constructor(workflowCall: WorkflowCallProps = {} as WorkflowCallProps) {
    this.inputs = Object.fromEntries(Object.entries(workflowCall.inputs || {}).map(([inputId, input]) => {
      return [inputId, new Input(input)];
    }));
    this.outputs = Object.fromEntries(Object.entries(workflowCall.outputs || {}).map(([ouputId, output]) => {
      return [ouputId, new Output(output)];
    }));

    this.secrets = workflowCall.secrets;
  }
}
