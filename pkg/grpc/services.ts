import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { RunnerServiceClient as _runner_v1_RunnerServiceClient, RunnerServiceDefinition as _runner_v1_RunnerServiceDefinition } from './runner/v1/RunnerService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  google: {
    protobuf: {
      ListValue: MessageTypeDefinition
      NullValue: EnumTypeDefinition
      Struct: MessageTypeDefinition
      Timestamp: MessageTypeDefinition
      Value: MessageTypeDefinition
    }
  }
  runner: {
    v1: {
      DeclareRequest: MessageTypeDefinition
      DeclareResponse: MessageTypeDefinition
      FetchTaskRequest: MessageTypeDefinition
      FetchTaskResponse: MessageTypeDefinition
      LogRow: MessageTypeDefinition
      RegisterRequest: MessageTypeDefinition
      RegisterResponse: MessageTypeDefinition
      Result: EnumTypeDefinition
      Runner: MessageTypeDefinition
      RunnerService: SubtypeConstructor<typeof grpc.Client, _runner_v1_RunnerServiceClient> & { service: _runner_v1_RunnerServiceDefinition }
      RunnerStatus: EnumTypeDefinition
      StepState: MessageTypeDefinition
      Task: MessageTypeDefinition
      TaskNeed: MessageTypeDefinition
      TaskState: MessageTypeDefinition
      UpdateLogRequest: MessageTypeDefinition
      UpdateLogResponse: MessageTypeDefinition
      UpdateTaskRequest: MessageTypeDefinition
      UpdateTaskResponse: MessageTypeDefinition
    }
  }
}

