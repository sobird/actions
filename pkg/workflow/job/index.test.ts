/* eslint-disable no-template-curly-in-string */
import Job from '.';
import Strategy from './strategy';

const workflowJob = new Job({
  name: 'job1',
  strategy: new Strategy({
    matrix: {
      os: ['ubuntu-latest', 'macos-latest'],
      node: [18, 20],
    },
  }),
  'runs-on': '${{ matrix.platform }}',
});

describe('test workflow job class', () => {
  it('parseMatrix', () => {
    const jobNames = workflowJob.spread().map((job) => {
      return job.name;
    });

    expect(jobNames).toEqual([
      'job1 (ubuntu-latest, 18)',
      'job1 (ubuntu-latest, 20)',
      'job1 (macos-latest, 18)',
      'job1 (macos-latest, 20)',
    ]);
  });
});
