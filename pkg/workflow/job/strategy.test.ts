import Strategy from './strategy';

describe('Strategy Class test', () => {
  it('get matrices empty test case', () => {
    const strategy = new Strategy({});

    expect(strategy.getMatrices()).toEqual([]);
  });

  it('get matrices test case', () => {
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

    expect(strategy.getMatrices()).toEqual([
      {
        datacenter: 'site-c', 'node-version': '14.x', site: 'staging', 'php-version': '5.4',
      },
      {
        datacenter: 'site-c', 'node-version': '16.x', site: 'staging', 'php-version': '5.4',
      },
      {
        datacenter: 'site-d', 'node-version': '14.x', site: 'staging', 'php-version': '5.4',
      },
      {
        datacenter: 'site-d', 'node-version': '16.x', site: 'staging', 'php-version': '5.4',
      },
      { datacenter: 'site-a', 'node-version': '10.x', site: 'prod' },
      { datacenter: 'site-b', 'node-version': '12.x', site: 'dev' },
    ]);
  });

  it('get matrices github test case', () => {
    const strategy = new Strategy({
      matrix: {
        fruit: ['apple', 'pear'],
        animal: ['cat', 'dog'],
        include: [{ color: 'green' }, { color: 'pink', animal: 'cat' }, { fruit: 'apple', shape: 'circle' }, { fruit: 'banana' }, { fruit: 'banana', animal: 'cat' }],
      },
    });

    expect(strategy.getMatrices()).toEqual([
      {
        fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle',
      },
      {
        fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle',
      },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' },
    ]);
  });

  it('select matrices test case', () => {
    const strategy = new Strategy({
      matrix: {
        fruit: ['apple', 'pear'],
        animal: ['cat', 'dog'],
        include: [{ color: 'green' }, { color: 'pink', animal: 'cat' }, { fruit: 'apple', shape: 'circle' }, { fruit: 'banana' }, { fruit: 'banana', animal: 'cat' }],
      },
    });

    const selected = strategy.selectMatrices({
      fruit: ['apple', ''],
    });

    expect(selected).toEqual([
      {
        fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle',
      },
      {
        fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle',
      },
    ]);
  });
});
