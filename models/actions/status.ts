/**
 * Status represents the status of ActionRun, ActionRunJob, ActionTask, or ActionTaskStep
 *
 * sobird<i@sobird.me> at 2024/12/01 21:08:55 created.
 */

import { Result } from '@/pkg/service/runner/v1/messages_pb';

export enum EStatus {
  unknown, // 0, consistent with runnerv1.Result_RESULT_UNSPECIFIED
  success, // 1, consistent with runnerv1.Result_RESULT_SUCCESS
  failure, // 2, consistent with runnerv1.Result_RESULT_FAILURE
  cancelled, // 3, consistent with runnerv1.Result_RESULT_CANCELLED
  skipped, // 4, consistent with runnerv1.Result_RESULT_SKIPPED
  waiting, // 5, isn't a runnerv1.Result
  running, // 6, isn't a runnerv1.Result
  blocked, // 7, isn't a runnerv1.Result
}

export default class Status {
  constructor(public status: EStatus) {}

  static get Unknown() {
    return new this(EStatus.unknown);
  }

  static get Success() {
    return new this(EStatus.success);
  }

  static get Failure() {
    return new this(EStatus.failure);
  }

  static get Cancelled() {
    return new this(EStatus.cancelled);
  }

  static get Skipped() {
    return new this(EStatus.skipped);
  }

  static get Waiting() {
    return new this(EStatus.waiting);
  }

  static get Running() {
    return new this(EStatus.running);
  }

  static get Blocked() {
    return new this(EStatus.blocked);
  }

  isUnknown() {
    return this.status === EStatus.unknown;
  }

  isSuccess() {
    return this.status === EStatus.success;
  }

  isFailure() {
    return this.status === EStatus.failure;
  }

  isCancelled() {
    return this.status === EStatus.cancelled;
  }

  isSkipped() {
    return this.status === EStatus.skipped;
  }

  isWaiting() {
    return this.status === EStatus.waiting;
  }

  isRunning() {
    return this.status === EStatus.running;
  }

  isBlocked() {
    return this.status === EStatus.blocked;
  }

  toString() {
    return EStatus[this.status];
  }

  in(...statuses: EStatus[]) {
    return statuses.includes(this.status);
  }

  // isDone returns whether the Status is final
  isDone() {
    return this.in(EStatus.success, EStatus.failure, EStatus.cancelled, EStatus.skipped);
  }

  asResult() {
    if (this.isDone()) {
      return Result[this.status];
    }
    return Result[Result.UNSPECIFIED];
  }

  static Values() {
    return Object.keys(EStatus).filter((key) => { return Number.isNaN(Number(key)); });
  }
}

console.log('Sta', Status.Values());
