// @generated by protoc-gen-connect-es v1.6.1 with parameter "target=ts"
// @generated from file runner/v1/services.proto (package runner.v1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { DeclareRequest, DeclareResponse, FetchTaskRequest, FetchTaskResponse, RegisterRequest, RegisterResponse, UpdateLogRequest, UpdateLogResponse, UpdateTaskRequest, UpdateTaskResponse } from "./messages_pb";
import { MethodKind } from "@bufbuild/protobuf";

/**
 * @generated from service runner.v1.RunnerService
 */
export const RunnerService = {
  typeName: "runner.v1.RunnerService",
  methods: {
    /**
     * Register register a new runner in server.
     *
     * @generated from rpc runner.v1.RunnerService.Register
     */
    register: {
      name: "Register",
      I: RegisterRequest,
      O: RegisterResponse,
      kind: MethodKind.Unary,
    },
    /**
     * Declare declare runner's version and labels to Gitea before starting fetching task.
     *
     * @generated from rpc runner.v1.RunnerService.Declare
     */
    declare: {
      name: "Declare",
      I: DeclareRequest,
      O: DeclareResponse,
      kind: MethodKind.Unary,
    },
    /**
     * FetchTask requests the next available task for execution.
     *
     * @generated from rpc runner.v1.RunnerService.FetchTask
     */
    fetchTask: {
      name: "FetchTask",
      I: FetchTaskRequest,
      O: FetchTaskResponse,
      kind: MethodKind.Unary,
    },
    /**
     * UpdateTask updates the task status.
     *
     * @generated from rpc runner.v1.RunnerService.UpdateTask
     */
    updateTask: {
      name: "UpdateTask",
      I: UpdateTaskRequest,
      O: UpdateTaskResponse,
      kind: MethodKind.Unary,
    },
    /**
     * UpdateLog uploads log of the task.
     *
     * @generated from rpc runner.v1.RunnerService.UpdateLog
     */
    updateLog: {
      name: "UpdateLog",
      I: UpdateLogRequest,
      O: UpdateLogResponse,
      kind: MethodKind.Unary,
    },
  }
} as const;

