import { ActionRunJob } from '@/models/actions';

import { Status } from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run_job');
vi.mock('./run');
vi.mock('./task');

// The aggregation reads only the status and the continue-on-error flag, so a bare
// object stands in for the row.
function createJob(status: Status, continueOnError: boolean): ActionRunJob {
  return { status, continueOnError } as unknown as ActionRunJob;
}

describe('aggregateStatus', () => {
  const testCases = [
    {
      name: 'no job leaves the status unknown',
      jobs: [],
      want: Status.Unknown,
    },
    {
      name: 'all success',
      jobs: [createJob(Status.Success, false), createJob(Status.Success, false)],
      want: Status.Success,
    },
    {
      name: 'one failure without continue-on-error',
      jobs: [createJob(Status.Success, false), createJob(Status.Failure, false)],
      want: Status.Failure,
    },
    {
      name: 'one failure with continue-on-error',
      jobs: [createJob(Status.Success, false), createJob(Status.Failure, true)],
      want: Status.Success,
    },
    {
      name: 'only continued-failure',
      jobs: [createJob(Status.Failure, true)],
      want: Status.Success,
    },
    {
      name: 'continued-failure plus real failure',
      jobs: [createJob(Status.Failure, true), createJob(Status.Failure, false)],
      want: Status.Failure,
    },
    {
      name: 'all skipped',
      jobs: [createJob(Status.Skipped, false), createJob(Status.Skipped, false)],
      want: Status.Skipped,
    },
    {
      name: 'continued-failure plus skipped counts as success',
      jobs: [createJob(Status.Failure, true), createJob(Status.Skipped, false)],
      want: Status.Success,
    },
    {
      name: 'waiting outranks blocked',
      jobs: [createJob(Status.Blocked, false), createJob(Status.Waiting, false)],
      want: Status.Waiting,
    },
    {
      name: 'blocked is still pending',
      jobs: [createJob(Status.Blocked, false)],
      want: Status.Blocked,
    },
    {
      name: 'running outranks waiting',
      jobs: [createJob(Status.Waiting, false), createJob(Status.Running, false)],
      want: Status.Running,
    },
    {
      name: 'cancelled outranks failure',
      jobs: [createJob(Status.Failure, false), createJob(Status.Cancelled, false)],
      want: Status.Cancelled,
    },
    {
      name: 'unfinished jobs leave the status unknown',
      jobs: [createJob(Status.Unknown, false)],
      want: Status.Unknown,
    },
  ];

  testCases.forEach(({ name, jobs, want }) => {
    it(name, () => {
      expect(ActionRunJob.aggregateStatus(jobs)).toBe(want);
    });
  });
});
