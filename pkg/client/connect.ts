import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-node';
import { RunnerService } from './runner/v1/services_connect';

// A transport for clients using the Connect protocol with Node.js `http` module
const transport = createConnectTransport({
  baseUrl: 'http://192.168.50.100:3000/api/actions',
  httpVersion: '1.1',
});

const client = createPromiseClient(RunnerService, transport);
const res = await client.register({
  name: 'test_runner',
  token: 'tOCwFvUOIFYzQCnc7MVt3z0OwEewLAhTUyZ4TUTv',
  agentLabels: [],
  version: '0.0.1',
  labels: [],
});
console.log(res.runner); // you said: I feel happy.
