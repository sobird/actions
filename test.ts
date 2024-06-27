import Expression from './pkg/expression';

const context = {
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
const expression = new Expression('${{ hashFiles("**/package.json") + "-sobird" }}', ['github']);
const result = await expression.evaluate({ context });
console.log('result', result);
