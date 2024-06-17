import Action from '.';

describe('test action Reader', () => {
  const yaml = `
  name: 'name'
  description: 'description',
  runs:
    using: 'node16'
    main: 'main.js'
  `;

  const cases = [
    {
      name: 'read action yml',
      filename: 'action.yml',
      yaml,
      expected: new Action({
        name: 'name',
        description: 'description',
        runs: {
          using: 'node16',
          main: 'main.js',
        },
      }),
    },
  ];

  for (const item of cases) {
    it(item.name, () => {
      //
      console.log('item', item.expected);
    });
  }
});
