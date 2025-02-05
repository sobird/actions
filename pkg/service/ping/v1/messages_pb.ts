// @generated by protoc-gen-es v2.2.3 with parameter "target=ts"
// @generated from file ping/v1/messages.proto (package ping.v1, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage } from "@bufbuild/protobuf/codegenv1";
import { fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv1";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file ping/v1/messages.proto.
 */
export const file_ping_v1_messages: GenFile = /*@__PURE__*/
  fileDesc("ChZwaW5nL3YxL21lc3NhZ2VzLnByb3RvEgdwaW5nLnYxIhsKC1BpbmdSZXF1ZXN0EgwKBGRhdGEYASABKAkiHAoMUGluZ1Jlc3BvbnNlEgwKBGRhdGEYASABKAlCWQoLY29tLnBpbmcudjFCDU1lc3NhZ2VzUHJvdG9QAaICA1BYWKoCB1BpbmcuVjHKAgdQaW5nXFYx4gITUGluZ1xWMVxHUEJNZXRhZGF0YeoCCFBpbmc6OlYxYgZwcm90bzM");

/**
 * @generated from message ping.v1.PingRequest
 */
export type PingRequest = Message<"ping.v1.PingRequest"> & {
  /**
   * @generated from field: string data = 1;
   */
  data: string;
};

/**
 * Describes the message ping.v1.PingRequest.
 * Use `create(PingRequestSchema)` to create a new message.
 */
export const PingRequestSchema: GenMessage<PingRequest> = /*@__PURE__*/
  messageDesc(file_ping_v1_messages, 0);

/**
 * @generated from message ping.v1.PingResponse
 */
export type PingResponse = Message<"ping.v1.PingResponse"> & {
  /**
   * @generated from field: string data = 1;
   */
  data: string;
};

/**
 * Describes the message ping.v1.PingResponse.
 * Use `create(PingResponseSchema)` to create a new message.
 */
export const PingResponseSchema: GenMessage<PingResponse> = /*@__PURE__*/
  messageDesc(file_ping_v1_messages, 1);

