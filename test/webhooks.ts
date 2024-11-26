import { createServer } from 'node:http';

import { Webhooks, createNodeMiddleware, EmitterWebhookEvent } from '@octokit/webhooks';

const webhooks = new Webhooks({
  secret: '',
});

webhooks.onAny(({ id, name, payload }) => {
  console.log(id, name, payload, 'event received');
});

createServer(createNodeMiddleware(webhooks)).listen(3000);
