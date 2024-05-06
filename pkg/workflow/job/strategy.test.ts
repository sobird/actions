import Strategy from './strategy';

const strategy = new Strategy({
  'fail-fast': false,
  matrix: {
    datacenter: ['site-c', 'site-d'],
    exclude: [{ datacenter: 'site-d', 'node-version': '14.x', site: 'staging' }],
    include: [{ 'php-version': '5.4' }, { datacenter: 'site-a', 'node-version': '10.x', site: 'prod' }, { datacenter: 'site-b', 'node-version': '12.x', site: 'dev' }],
    'node-version': ['14.x', '16.x'],
    site: ['staging'],
  },
  'max-parallel': 2,
});

describe('Strategy Class test', () => {
  it('get matrices test case', () => {
    // console.log('first', strategy.matrices);

    expect(strategy.matrices).toEqual([
      { datacenter: 'site-c', 'node-version': '14.x', site: 'staging' },
      { datacenter: 'site-c', 'node-version': '16.x', site: 'staging' },
      { datacenter: 'site-d', 'node-version': '16.x', site: 'staging' },
      { 'php-version': '5.4' },
      { datacenter: 'site-a', 'node-version': '10.x', site: 'prod' },
      { datacenter: 'site-b', 'node-version': '12.x', site: 'dev' },
    ]);
  });
});
