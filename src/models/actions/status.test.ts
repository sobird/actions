// actions.test.ts
import { describe, it, expect } from 'vitest';

import { Result } from '@/gen/runner/v1/messages_pb';

import { Status } from './status';

// 假设你的 Status 是类版本
describe('Status', () => {
  describe('asResult', () => {
    const cases = [
      { status: Status.Unknown, want: Result.UNSPECIFIED },
      { status: Status.Waiting, want: Result.UNSPECIFIED },
      { status: Status.Running, want: Result.UNSPECIFIED },
      { status: Status.Blocked, want: Result.UNSPECIFIED },
      { status: Status.Success, want: Result.SUCCESS },
      { status: Status.Failure, want: Result.FAILURE },
      { status: Status.Cancelled, want: Result.CANCELLED },
      { status: Status.Cancelling, want: Result.CANCELLED },
      { status: Status.Skipped, want: Result.SKIPPED },
    ];

    cases.forEach(({ status, want }) => {
      it(`should convert ${status.toString()} to ${want}`, () => {
        expect(status.asResult()).toBe(want);
      });
    });
  });

  describe('fromResult', () => {
    const cases = [
      { result: Result.UNSPECIFIED, want: Status.Unknown },
      { result: Result.SUCCESS, want: Status.Success },
      { result: Result.FAILURE, want: Status.Failure },
      { result: Result.CANCELLED, want: Status.Cancelled },
      { result: Result.SKIPPED, want: Status.Skipped },
    ];

    cases.forEach(({ result, want }) => {
      it(`should convert ${result} to ${want.toString()}`, () => {
        expect(Status.fromResult(result)).toBe(want);
      });
    });
  });

  describe('mergeResults', () => {
    const cases = [
      { current: Result.SUCCESS, coming: Result.SUCCESS, want: Result.SUCCESS },
      { current: Result.SUCCESS, coming: Result.FAILURE, want: Result.FAILURE },
      { current: Result.FAILURE, coming: Result.SUCCESS, want: Result.FAILURE },
      { current: Result.FAILURE, coming: Result.CANCELLED, want: Result.CANCELLED },
      { current: Result.CANCELLED, coming: Result.FAILURE, want: Result.CANCELLED },
      { current: Result.SKIPPED, coming: Result.FAILURE, want: Result.SKIPPED },
      { current: Result.UNSPECIFIED, coming: Result.FAILURE, want: Result.FAILURE },
      { current: Result.FAILURE, coming: Result.UNSPECIFIED, want: Result.FAILURE },
    ];

    cases.forEach(({ current, coming, want }) => {
      it(`should merge ${Result[current]}/${Result[coming]} to ${Result[want]}`, () => {
        expect(Status.mergeResults(current, coming)).toBe(want);
      });
    });
  });
});
