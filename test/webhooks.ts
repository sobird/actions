import { createServer } from 'node:http';

import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';

const webhooks = new Webhooks({
  secret: 'mysecret',
});

webhooks.onAny(({ id, name, payload }) => {
  console.log(name, 'event received', payload);
});

createServer(createNodeMiddleware(webhooks)).listen(3000);
