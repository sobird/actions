import { createHmac } from 'node:crypto';

import { Webhooks, createNodeMiddleware, EmitterWebhookEvent } from '@octokit/webhooks';
import { NextRequest, NextResponse } from 'next/server';

const webhooks = new Webhooks({
  secret: 'mysecret',
});

// webhooks
//   .verifyAndReceive({
//     id: webhookEvent['x-request-id'],
//     name: webhookEvent['x-github-event'],
//     signature: webhookEvent['x-hub-signature'],
//     payload: JSON.stringify(webhookEvent.body),
//   });

// webhooks.receive();

const algorithm_sha256 = 'sha256';
const algorithm_sha1 = 'sha1';

// const hookEvent: EmitterWebhookEvent<'push'>;

export const POST = async (req: NextRequest) => {
  console.log('req.headers', req.headers);
  const payload = await req.text();
  console.log('payload', payload);

  // console.log('signature-256', `${algorithm_sha256}=${createHmac(algorithm_sha256, '515385529').update(payload).digest('hex')}`);
  // console.log('signature-1', `${algorithm_sha1}=${createHmac(algorithm_sha1, '515385529').update(payload).digest('hex')}`);

  // console.log('req.body', await req.json());

  return NextResponse.json({
    name: 'sobird',
  });
};

export const GET = (req: NextRequest) => {
  console.log('req', req);

  return NextResponse.json({
    name: 'sobird',
  });
};
