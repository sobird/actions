import SmeeClient from 'smee-client';

const smee = new SmeeClient({
  source: 'https://smee.io/whbhI9YwwQqOS2I',
  target: 'http://localhost:3000/api/github/webhooks',
  logger: console,
});

smee.start();

// (smee.start() as EventSource).onmessage = (event) => {
//   const webhookEvent = JSON.parse(event.data);
//   console.log('webhookEvent', webhookEvent);
// };

// Stop forwarding events
// events.close();
