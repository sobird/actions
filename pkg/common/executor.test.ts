/**
 * executor test
 *
 * sobird<i@sobird.me> at 2024/05/04 23:43:52 created.
 */

import Executor from './executor';

describe('PipelineExecutor', () => {
  it('emptyWorkflow', () => {
    const emptyWorkflow = Executor.pipeline();
    console.log('emptyWorkflow', emptyWorkflow);
  });
});
