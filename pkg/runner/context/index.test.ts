import githubContext from '@/pkg/service/__mocks__/data/context';

import Context from '.';

const context = new Context({
  github: githubContext,
});

console.log('context', context);
