/**
 * Status represents the status of ActionRun, ActionRunJob, ActionTask, or ActionTaskStep
 *
 * sobird<i@sobird.me> at 2024/12/01 21:08:55 created.
 */

import { Result } from '@/pkg/service/runner/v1/messages_pb';

export enum EStatus {
  Unknown, // 0, consistent with runnerv1.Result_RESULT_UNSPECIFIED
  Success, // 1, consistent with runnerv1.Result_RESULT_SUCCESS
  Failure, // 2, consistent with runnerv1.Result_RESULT_FAILURE
  Cancelled, // 3, consistent with runnerv1.Result_RESULT_CANCELLED
  Skipped, // 4, consistent with runnerv1.Result_RESULT_SKIPPED
  Waiting, // 5, isn't a runnerv1.Result
  Running, // 6, isn't a runnerv1.Result
  Blocked, // 7, isn't a runnerv1.Result
}

export default class Status {
  constructor(public status: EStatus) {}

  static get Unknown() {
    return new this(EStatus.Unknown);
  }

  static get Success() {
    return new this(EStatus.Success);
  }

  static get Failure() {
    return new this(EStatus.Failure);
  }

  static get Cancelled() {
    return new this(EStatus.Cancelled);
  }

  static get Skipped() {
    return new this(EStatus.Skipped);
  }

  static get Waiting() {
    return new this(EStatus.Waiting);
  }

  static get Running() {
    return new this(EStatus.Running);
  }

  static get Blocked() {
    return new this(EStatus.Blocked);
  }

  isUnknown() {
    return this.status === EStatus.Unknown;
  }

  isSuccess() {
    return this.status === EStatus.Success;
  }

  isFailure() {
    return this.status === EStatus.Failure;
  }

  isCancelled() {
    return this.status === EStatus.Cancelled;
  }

  isSkipped() {
    return this.status === EStatus.Skipped;
  }

  isWaiting() {
    return this.status === EStatus.Waiting;
  }

  isRunning() {
    return this.status === EStatus.Running;
  }

  isBlocked() {
    return this.status === EStatus.Blocked;
  }

  toString() {
    return EStatus[this.status].toLowerCase();
  }

  valueOf() {
    return this.status;
  }

  in(...statuses: EStatus[]) {
    return statuses.includes(this.status);
  }

  // isDone returns whether the Status is final
  isDone() {
    return this.in(EStatus.Success, EStatus.Failure, EStatus.Cancelled, EStatus.Skipped);
  }

  asResult() {
    if (this.isDone()) {
      return Result[this.status];
    }
    return Result[Result.UNSPECIFIED];
  }

  static Values() {
    return Object.keys(EStatus).filter((key) => { return Number.isNaN(Number(key)); }).map((key) => { return key.toLowerCase(); });
  }
}
