// @generated by protoc-gen-es v1.10.0 with parameter "target=ts"
// @generated from file runner/v1/messages.proto (package runner.v1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message, proto3, protoInt64, Struct, Timestamp } from "@bufbuild/protobuf";

/**
 * RunnerStatus runner all status
 *
 * @generated from enum runner.v1.RunnerStatus
 */
export enum RunnerStatus {
  /**
   * @generated from enum value: RUNNER_STATUS_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: RUNNER_STATUS_IDLE = 1;
   */
  IDLE = 1,

  /**
   * @generated from enum value: RUNNER_STATUS_ACTIVE = 2;
   */
  ACTIVE = 2,

  /**
   * @generated from enum value: RUNNER_STATUS_OFFLINE = 3;
   */
  OFFLINE = 3,
}
// Retrieve enum metadata with: proto3.getEnumType(RunnerStatus)
proto3.util.setEnumType(RunnerStatus, "runner.v1.RunnerStatus", [
  { no: 0, name: "RUNNER_STATUS_UNSPECIFIED" },
  { no: 1, name: "RUNNER_STATUS_IDLE" },
  { no: 2, name: "RUNNER_STATUS_ACTIVE" },
  { no: 3, name: "RUNNER_STATUS_OFFLINE" },
]);

/**
 * The result of a task or a step, see https://docs.github.com/en/actions/learn-github-actions/contexts#jobs-context .
 *
 * @generated from enum runner.v1.Result
 */
export enum Result {
  /**
   * @generated from enum value: RESULT_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: RESULT_SUCCESS = 1;
   */
  SUCCESS = 1,

  /**
   * @generated from enum value: RESULT_FAILURE = 2;
   */
  FAILURE = 2,

  /**
   * @generated from enum value: RESULT_CANCELLED = 3;
   */
  CANCELLED = 3,

  /**
   * @generated from enum value: RESULT_SKIPPED = 4;
   */
  SKIPPED = 4,
}
// Retrieve enum metadata with: proto3.getEnumType(Result)
proto3.util.setEnumType(Result, "runner.v1.Result", [
  { no: 0, name: "RESULT_UNSPECIFIED" },
  { no: 1, name: "RESULT_SUCCESS" },
  { no: 2, name: "RESULT_FAILURE" },
  { no: 3, name: "RESULT_CANCELLED" },
  { no: 4, name: "RESULT_SKIPPED" },
]);

/**
 * @generated from message runner.v1.RegisterRequest
 */
export class RegisterRequest extends Message<RegisterRequest> {
  /**
   * @generated from field: string name = 1;
   */
  name = "";

  /**
   * @generated from field: string token = 2;
   */
  token = "";

  /**
   * @generated from field: repeated string agent_labels = 3 [deprecated = true];
   * @deprecated
   */
  agentLabels: string[] = [];

  /**
   * @generated from field: repeated string custom_labels = 4 [deprecated = true];
   * @deprecated
   */
  customLabels: string[] = [];

  /**
   * @generated from field: string version = 5;
   */
  version = "";

  /**
   * @generated from field: repeated string labels = 6;
   */
  labels: string[] = [];

  constructor(data?: PartialMessage<RegisterRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.RegisterRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "token", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "agent_labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 4, name: "custom_labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 5, name: "version", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 6, name: "labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RegisterRequest {
    return new RegisterRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RegisterRequest {
    return new RegisterRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RegisterRequest {
    return new RegisterRequest().fromJsonString(jsonString, options);
  }

  static equals(a: RegisterRequest | PlainMessage<RegisterRequest> | undefined, b: RegisterRequest | PlainMessage<RegisterRequest> | undefined): boolean {
    return proto3.util.equals(RegisterRequest, a, b);
  }
}

/**
 * @generated from message runner.v1.RegisterResponse
 */
export class RegisterResponse extends Message<RegisterResponse> {
  /**
   * @generated from field: runner.v1.Runner runner = 1;
   */
  runner?: Runner;

  constructor(data?: PartialMessage<RegisterResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.RegisterResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "runner", kind: "message", T: Runner },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RegisterResponse {
    return new RegisterResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RegisterResponse {
    return new RegisterResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RegisterResponse {
    return new RegisterResponse().fromJsonString(jsonString, options);
  }

  static equals(a: RegisterResponse | PlainMessage<RegisterResponse> | undefined, b: RegisterResponse | PlainMessage<RegisterResponse> | undefined): boolean {
    return proto3.util.equals(RegisterResponse, a, b);
  }
}

/**
 * @generated from message runner.v1.DeclareRequest
 */
export class DeclareRequest extends Message<DeclareRequest> {
  /**
   * @generated from field: string version = 1;
   */
  version = "";

  /**
   * @generated from field: repeated string labels = 2;
   */
  labels: string[] = [];

  constructor(data?: PartialMessage<DeclareRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.DeclareRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "version", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DeclareRequest {
    return new DeclareRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DeclareRequest {
    return new DeclareRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DeclareRequest {
    return new DeclareRequest().fromJsonString(jsonString, options);
  }

  static equals(a: DeclareRequest | PlainMessage<DeclareRequest> | undefined, b: DeclareRequest | PlainMessage<DeclareRequest> | undefined): boolean {
    return proto3.util.equals(DeclareRequest, a, b);
  }
}

/**
 * @generated from message runner.v1.DeclareResponse
 */
export class DeclareResponse extends Message<DeclareResponse> {
  /**
   * @generated from field: runner.v1.Runner runner = 1;
   */
  runner?: Runner;

  constructor(data?: PartialMessage<DeclareResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.DeclareResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "runner", kind: "message", T: Runner },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DeclareResponse {
    return new DeclareResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DeclareResponse {
    return new DeclareResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DeclareResponse {
    return new DeclareResponse().fromJsonString(jsonString, options);
  }

  static equals(a: DeclareResponse | PlainMessage<DeclareResponse> | undefined, b: DeclareResponse | PlainMessage<DeclareResponse> | undefined): boolean {
    return proto3.util.equals(DeclareResponse, a, b);
  }
}

/**
 * @generated from message runner.v1.FetchTaskRequest
 */
export class FetchTaskRequest extends Message<FetchTaskRequest> {
  /**
   * Runner use `tasks_version` to compare with Gitea and detemine whether new tasks may exist.
   *
   * @generated from field: int64 tasks_version = 1;
   */
  tasksVersion = protoInt64.zero;

  constructor(data?: PartialMessage<FetchTaskRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.FetchTaskRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "tasks_version", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): FetchTaskRequest {
    return new FetchTaskRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): FetchTaskRequest {
    return new FetchTaskRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): FetchTaskRequest {
    return new FetchTaskRequest().fromJsonString(jsonString, options);
  }

  static equals(a: FetchTaskRequest | PlainMessage<FetchTaskRequest> | undefined, b: FetchTaskRequest | PlainMessage<FetchTaskRequest> | undefined): boolean {
    return proto3.util.equals(FetchTaskRequest, a, b);
  }
}

/**
 * @generated from message runner.v1.FetchTaskResponse
 */
export class FetchTaskResponse extends Message<FetchTaskResponse> {
  /**
   * @generated from field: runner.v1.Task task = 1;
   */
  task?: Task;

  /**
   * Gitea informs the Runner of the latest version of tasks through `tasks_version`.
   *
   * @generated from field: int64 tasks_version = 2;
   */
  tasksVersion = protoInt64.zero;

  constructor(data?: PartialMessage<FetchTaskResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.FetchTaskResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "task", kind: "message", T: Task },
    { no: 2, name: "tasks_version", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): FetchTaskResponse {
    return new FetchTaskResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): FetchTaskResponse {
    return new FetchTaskResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): FetchTaskResponse {
    return new FetchTaskResponse().fromJsonString(jsonString, options);
  }

  static equals(a: FetchTaskResponse | PlainMessage<FetchTaskResponse> | undefined, b: FetchTaskResponse | PlainMessage<FetchTaskResponse> | undefined): boolean {
    return proto3.util.equals(FetchTaskResponse, a, b);
  }
}

/**
 * @generated from message runner.v1.UpdateTaskRequest
 */
export class UpdateTaskRequest extends Message<UpdateTaskRequest> {
  /**
   * @generated from field: runner.v1.TaskState state = 1;
   */
  state?: TaskState;

  /**
   * The outputs of the task. Since the outputs may be large, the client does not need to send all outputs every time, only the unsent outputs.
   *
   * @generated from field: map<string, string> outputs = 2;
   */
  outputs: { [key: string]: string } = {};

  constructor(data?: PartialMessage<UpdateTaskRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.UpdateTaskRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "state", kind: "message", T: TaskState },
    { no: 2, name: "outputs", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateTaskRequest {
    return new UpdateTaskRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateTaskRequest {
    return new UpdateTaskRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateTaskRequest {
    return new UpdateTaskRequest().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateTaskRequest | PlainMessage<UpdateTaskRequest> | undefined, b: UpdateTaskRequest | PlainMessage<UpdateTaskRequest> | undefined): boolean {
    return proto3.util.equals(UpdateTaskRequest, a, b);
  }
}

/**
 * @generated from message runner.v1.UpdateTaskResponse
 */
export class UpdateTaskResponse extends Message<UpdateTaskResponse> {
  /**
   * @generated from field: runner.v1.TaskState state = 1;
   */
  state?: TaskState;

  /**
   * The keys of the outputs that have been sent, not only the ones that have been sent this time, but also those that have been sent before.
   *
   * @generated from field: repeated string sent_outputs = 2;
   */
  sentOutputs: string[] = [];

  constructor(data?: PartialMessage<UpdateTaskResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.UpdateTaskResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "state", kind: "message", T: TaskState },
    { no: 2, name: "sent_outputs", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateTaskResponse {
    return new UpdateTaskResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateTaskResponse {
    return new UpdateTaskResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateTaskResponse {
    return new UpdateTaskResponse().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateTaskResponse | PlainMessage<UpdateTaskResponse> | undefined, b: UpdateTaskResponse | PlainMessage<UpdateTaskResponse> | undefined): boolean {
    return proto3.util.equals(UpdateTaskResponse, a, b);
  }
}

/**
 * @generated from message runner.v1.UpdateLogRequest
 */
export class UpdateLogRequest extends Message<UpdateLogRequest> {
  /**
   * @generated from field: int64 task_id = 1;
   */
  taskId = protoInt64.zero;

  /**
   * The actual index of the first line.
   *
   * @generated from field: int64 index = 2;
   */
  index = protoInt64.zero;

  /**
   * @generated from field: repeated runner.v1.LogRow rows = 3;
   */
  rows: LogRow[] = [];

  /**
   * No more logs.
   *
   * @generated from field: bool no_more = 4;
   */
  noMore = false;

  constructor(data?: PartialMessage<UpdateLogRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.UpdateLogRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "task_id", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "index", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 3, name: "rows", kind: "message", T: LogRow, repeated: true },
    { no: 4, name: "no_more", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateLogRequest {
    return new UpdateLogRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateLogRequest {
    return new UpdateLogRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateLogRequest {
    return new UpdateLogRequest().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateLogRequest | PlainMessage<UpdateLogRequest> | undefined, b: UpdateLogRequest | PlainMessage<UpdateLogRequest> | undefined): boolean {
    return proto3.util.equals(UpdateLogRequest, a, b);
  }
}

/**
 * @generated from message runner.v1.UpdateLogResponse
 */
export class UpdateLogResponse extends Message<UpdateLogResponse> {
  /**
   * If all lines are received, should be index + length(lines).
   *
   * @generated from field: int64 ack_index = 1;
   */
  ackIndex = protoInt64.zero;

  constructor(data?: PartialMessage<UpdateLogResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.UpdateLogResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "ack_index", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateLogResponse {
    return new UpdateLogResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateLogResponse {
    return new UpdateLogResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateLogResponse {
    return new UpdateLogResponse().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateLogResponse | PlainMessage<UpdateLogResponse> | undefined, b: UpdateLogResponse | PlainMessage<UpdateLogResponse> | undefined): boolean {
    return proto3.util.equals(UpdateLogResponse, a, b);
  }
}

/**
 * Runner Payload
 *
 * @generated from message runner.v1.Runner
 */
export class Runner extends Message<Runner> {
  /**
   * @generated from field: int64 id = 1;
   */
  id = protoInt64.zero;

  /**
   * @generated from field: string uuid = 2;
   */
  uuid = "";

  /**
   * @generated from field: string token = 3;
   */
  token = "";

  /**
   * @generated from field: string name = 4;
   */
  name = "";

  /**
   * @generated from field: runner.v1.RunnerStatus status = 5;
   */
  status = RunnerStatus.UNSPECIFIED;

  /**
   * @generated from field: repeated string agent_labels = 6 [deprecated = true];
   * @deprecated
   */
  agentLabels: string[] = [];

  /**
   * @generated from field: repeated string custom_labels = 7 [deprecated = true];
   * @deprecated
   */
  customLabels: string[] = [];

  /**
   * @generated from field: string version = 8;
   */
  version = "";

  /**
   * @generated from field: repeated string labels = 9;
   */
  labels: string[] = [];

  constructor(data?: PartialMessage<Runner>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.Runner";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "uuid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "token", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "status", kind: "enum", T: proto3.getEnumType(RunnerStatus) },
    { no: 6, name: "agent_labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 7, name: "custom_labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 8, name: "version", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 9, name: "labels", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Runner {
    return new Runner().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Runner {
    return new Runner().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Runner {
    return new Runner().fromJsonString(jsonString, options);
  }

  static equals(a: Runner | PlainMessage<Runner> | undefined, b: Runner | PlainMessage<Runner> | undefined): boolean {
    return proto3.util.equals(Runner, a, b);
  }
}

/**
 * Task represents a task.
 *
 * @generated from message runner.v1.Task
 */
export class Task extends Message<Task> {
  /**
   * A unique number for each workflow run, unlike run_id or job_id, task_id never be reused.
   *
   * @generated from field: int64 id = 1;
   */
  id = protoInt64.zero;

  /**
   * The content of the expanded workflow yaml file.
   *
   * @generated from field: optional bytes workflow_payload = 2;
   */
  workflowPayload?: Uint8Array;

  /**
   * See https://docs.github.com/en/actions/learn-github-actions/contexts#github-context .
   *
   * @generated from field: optional google.protobuf.Struct context = 3;
   */
  context?: Struct;

  /**
   * See https://docs.github.com/en/actions/learn-github-actions/contexts#secrets-context .
   *
   * @generated from field: map<string, string> secrets = 4;
   */
  secrets: { [key: string]: string } = {};

  /**
   * Unused.
   *
   * @generated from field: string machine = 5 [deprecated = true];
   * @deprecated
   */
  machine = "";

  /**
   * See https://docs.github.com/en/actions/learn-github-actions/contexts#needs-context .
   *
   * @generated from field: map<string, runner.v1.TaskNeed> needs = 6;
   */
  needs: { [key: string]: TaskNeed } = {};

  /**
   * See https://docs.github.com/en/actions/learn-github-actions/contexts#vars-context .
   *
   * @generated from field: map<string, string> vars = 7;
   */
  vars: { [key: string]: string } = {};

  constructor(data?: PartialMessage<Task>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.Task";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "workflow_payload", kind: "scalar", T: 12 /* ScalarType.BYTES */, opt: true },
    { no: 3, name: "context", kind: "message", T: Struct, opt: true },
    { no: 4, name: "secrets", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
    { no: 5, name: "machine", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 6, name: "needs", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "message", T: TaskNeed} },
    { no: 7, name: "vars", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Task {
    return new Task().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Task {
    return new Task().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Task {
    return new Task().fromJsonString(jsonString, options);
  }

  static equals(a: Task | PlainMessage<Task> | undefined, b: Task | PlainMessage<Task> | undefined): boolean {
    return proto3.util.equals(Task, a, b);
  }
}

/**
 * TaskNeed represents a task need.
 *
 * @generated from message runner.v1.TaskNeed
 */
export class TaskNeed extends Message<TaskNeed> {
  /**
   * The set of outputs of a job that the current job depends on.
   *
   * @generated from field: map<string, string> outputs = 1;
   */
  outputs: { [key: string]: string } = {};

  /**
   * The result of a job that the current job depends on. Possible values are success, failure, cancelled, or skipped.
   *
   * @generated from field: runner.v1.Result result = 2;
   */
  result = Result.UNSPECIFIED;

  constructor(data?: PartialMessage<TaskNeed>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.TaskNeed";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "outputs", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
    { no: 2, name: "result", kind: "enum", T: proto3.getEnumType(Result) },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): TaskNeed {
    return new TaskNeed().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): TaskNeed {
    return new TaskNeed().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): TaskNeed {
    return new TaskNeed().fromJsonString(jsonString, options);
  }

  static equals(a: TaskNeed | PlainMessage<TaskNeed> | undefined, b: TaskNeed | PlainMessage<TaskNeed> | undefined): boolean {
    return proto3.util.equals(TaskNeed, a, b);
  }
}

/**
 * TaskState represents the state of a task.
 *
 * @generated from message runner.v1.TaskState
 */
export class TaskState extends Message<TaskState> {
  /**
   * @generated from field: int64 id = 1;
   */
  id = protoInt64.zero;

  /**
   * @generated from field: runner.v1.Result result = 2;
   */
  result = Result.UNSPECIFIED;

  /**
   * @generated from field: google.protobuf.Timestamp started_at = 3;
   */
  startedAt?: Timestamp;

  /**
   * @generated from field: google.protobuf.Timestamp stopped_at = 4;
   */
  stoppedAt?: Timestamp;

  /**
   * @generated from field: repeated runner.v1.StepState steps = 5;
   */
  steps: StepState[] = [];

  constructor(data?: PartialMessage<TaskState>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.TaskState";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "result", kind: "enum", T: proto3.getEnumType(Result) },
    { no: 3, name: "started_at", kind: "message", T: Timestamp },
    { no: 4, name: "stopped_at", kind: "message", T: Timestamp },
    { no: 5, name: "steps", kind: "message", T: StepState, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): TaskState {
    return new TaskState().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): TaskState {
    return new TaskState().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): TaskState {
    return new TaskState().fromJsonString(jsonString, options);
  }

  static equals(a: TaskState | PlainMessage<TaskState> | undefined, b: TaskState | PlainMessage<TaskState> | undefined): boolean {
    return proto3.util.equals(TaskState, a, b);
  }
}

/**
 * TaskState represents the state of a step.
 *
 * @generated from message runner.v1.StepState
 */
export class StepState extends Message<StepState> {
  /**
   * @generated from field: int64 id = 1;
   */
  id = protoInt64.zero;

  /**
   * @generated from field: runner.v1.Result result = 2;
   */
  result = Result.UNSPECIFIED;

  /**
   * @generated from field: google.protobuf.Timestamp started_at = 3;
   */
  startedAt?: Timestamp;

  /**
   * @generated from field: google.protobuf.Timestamp stopped_at = 4;
   */
  stoppedAt?: Timestamp;

  /**
   * Where the first line log of the step.
   *
   * @generated from field: int64 log_index = 5;
   */
  logIndex = protoInt64.zero;

  /**
   * How many logs the step has.
   *
   * @generated from field: int64 log_length = 6;
   */
  logLength = protoInt64.zero;

  constructor(data?: PartialMessage<StepState>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.StepState";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 2, name: "result", kind: "enum", T: proto3.getEnumType(Result) },
    { no: 3, name: "started_at", kind: "message", T: Timestamp },
    { no: 4, name: "stopped_at", kind: "message", T: Timestamp },
    { no: 5, name: "log_index", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 6, name: "log_length", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): StepState {
    return new StepState().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): StepState {
    return new StepState().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): StepState {
    return new StepState().fromJsonString(jsonString, options);
  }

  static equals(a: StepState | PlainMessage<StepState> | undefined, b: StepState | PlainMessage<StepState> | undefined): boolean {
    return proto3.util.equals(StepState, a, b);
  }
}

/**
 * LogRow represents a row of logs.
 *
 * @generated from message runner.v1.LogRow
 */
export class LogRow extends Message<LogRow> {
  /**
   * @generated from field: google.protobuf.Timestamp time = 1;
   */
  time?: Timestamp;

  /**
   * @generated from field: string content = 2;
   */
  content = "";

  constructor(data?: PartialMessage<LogRow>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "runner.v1.LogRow";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "time", kind: "message", T: Timestamp },
    { no: 2, name: "content", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): LogRow {
    return new LogRow().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): LogRow {
    return new LogRow().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): LogRow {
    return new LogRow().fromJsonString(jsonString, options);
  }

  static equals(a: LogRow | PlainMessage<LogRow> | undefined, b: LogRow | PlainMessage<LogRow> | undefined): boolean {
    return proto3.util.equals(LogRow, a, b);
  }
}

