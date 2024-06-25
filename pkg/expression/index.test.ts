/* eslint-disable no-template-curly-in-string */
import Context from '@/pkg/runner/context';

import Expression from '.';

const context: DeepPartial<Context> = {
  github: {
    actor: 'sobird',
    event_name: 'push',
    event: {
      issue: {
        labels: [
          {
            name: 'bug',
          },
          {
            name: 'error',
          },
        ],
      },
    },
  },
};

const literals = [{
  source: '${{ false }}',
  expected: 'false',
},
{
  source: '${{ null }}',
  expected: '',
},
{
  source: '${{ 711 }}',
  expected: '711',
}, {
  source: '${{ -9.2 }}',
  expected: '-9.2',
}, {
  source: '${{ 0xff }}',
  expected: '255',
}, {
  source: '${{ github.event }}',
  expected: '[object Object]',
}];

const operators = [
  {
    source: '${{ (2 + 2) * 3 }}',
    expected: '12',
  },
  {
    source: "${{ github['actor'] }}",
    expected: 'sobird',
  },
  {
    source: '${{ github.actor }}',
    expected: 'sobird',
  },
  {
    source: '${{ !true }}',
    expected: 'false',
  },
  {
    source: '${{ 123 < 456 && 123 <= 456 && 123 <=123 }}',
    expected: 'true',
  },
  {
    source: '${{ 456 > 123 && 456 >= 123 && 456 >= 456 }}',
    expected: 'true',
  },
  {
    source: '${{ 123 == 123 }}',
    expected: 'true',
  },
  {
    source: '${{ 123 != 456 }}',
    expected: 'true',
  },
  {
    source: '${{ 0 || 456 }}',
    expected: '456',
  },
];

const functions = [{
  source: "${{ contains('Hello world', 'llo') }}",
  expected: 'true',
}, {
  source: "${{ contains(github.event.issue.labels.*.name, 'bug') }}",
  expected: 'true',
}, {
  source: "${{ fromJSON('[\"push\", \"pull_request\"]') }}",
  expected: 'push,pull_request',
}, {
  source: "${{ contains(fromJSON('[\"push\", \"pull_request\"]'), github.event_name) }}",
  expected: 'true',
}, {
  source: "${{startsWith('Hello world', 'He')}}",
  expected: 'true',
}, {
  source: "${{endsWith('Hello world', 'ld')}}",
  expected: 'true',
}, {
  source: "${{ format('Hello {0} {1} {2}', 'Mona', 'the', 'Octocat') }}",
  expected: 'Hello Mona the Octocat',
},
// {
//   source: "${{ format('{{Hello {0} {1} {2}}}', 'Mona', 'the', 'Octocat') }}",
//   expected: '{Hello Mona the Octocat!}',
// },
{
  source: "${{ join(github.event.issue.labels.*.name, ', ') }}",
  expected: 'bug, error',
}, {
  source: '${{ toJSON(github) }}',
  expected: JSON.stringify(context.github),
},
];

describe('test Expression Literals', () => {
  literals.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(context);
      expect(result).toBe(item.expected);
    });
  });
});

describe('test Expression Operators', () => {
  operators.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(context);
      expect(result).toBe(item.expected);
    });
  });
});

describe('test Expression Functions', () => {
  functions.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(context);
      console.log('result', result, item.expected);
      expect(result).toBe(item.expected);
    });
  });
});
