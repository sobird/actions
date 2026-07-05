/**
 * Status represents the status of ActionRun, ActionRunJob, ActionTask, or ActionTaskStep
 *
 * sobird<i@sobird.me> at 2024/12/01 21:08:55 created.
 */

import { Result } from '@/gen/runner/v1/messages_pb';

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

export class Status {
  static readonly Unknown = new Status('unknown');
  static readonly Waiting = new Status('waiting');
  static readonly Running = new Status('running');
  static readonly Success = new Status('success');
  static readonly Failure = new Status('failure');
  static readonly Cancelled = new Status('cancelled');
  static readonly Cancelling = new Status('cancelling');
  static readonly Skipped = new Status('skipped');
  static readonly Blocked = new Status('blocked');

  private constructor(public readonly value: string) {}

  // String returns the string name of the Status
  toString() {
    return this.value;
  }

  // LocaleString returns the locale string name of the Status
  toLocaleString(translate: (key: string) => string): string {
    return translate(`actions.status.${this.value}`);
  }

  isUnknown() {
    return this === Status.Unknown;
  }

  isSuccess() {
    return this === Status.Success;
  }

  isFailure() {
    return this === Status.Failure;
  }

  isCancelled() {
    return this === Status.Cancelled;
  }

  isSkipped() {
    return this === Status.Skipped;
  }

  isWaiting() {
    return this === Status.Waiting;
  }

  isRunning() {
    return this === Status.Running;
  }

  isBlocked() {
    return this === Status.Blocked;
  }

  isCancelling() {
    return this === Status.Cancelling;
  }

  in(...statuses: Status[]) {
    return statuses.includes(this);
  }

  // isDone returns whether the Status is final
  isDone() {
    return this.in(Status.Success, Status.Failure, Status.Cancelled, Status.Skipped);
  }

  // HasRun returns whether the Status is a result of running
  hasRun(): boolean {
    return this.in(Status.Success, Status.Failure);
  }

  asResult() {
    if (this === Status.Success) return Result.SUCCESS;
    if (this === Status.Failure) return Result.FAILURE;
    if (this === Status.Cancelled || this === Status.Cancelling) {
      return Result.CANCELLED;
    }
    if (this === Status.Skipped) return Result.SKIPPED;
    return Result.UNSPECIFIED;
  }

  static fromResult(result: Result) {
    switch (result) {
      case Result.SUCCESS:
        return Status.Success;
      case Result.FAILURE:
        return Status.Failure;
      case Result.CANCELLED:
        return Status.Cancelled;
      case Result.SKIPPED:
        return Status.Skipped;
      default:
        return Status.Unknown;
    }
  }
}
