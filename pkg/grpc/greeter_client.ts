/* eslint-disable @typescript-eslint/naming-convention */
/*
 *
 * Copyright 2015 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import http from 'http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
// import { ProtoGrpcType } from './helloworld';
import { ProtoGrpcType } from './services';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROTO_PATH = `${__dirname}/services.proto`;

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  },
);
const { runner } = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
// const hello_proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

// console.log('runner', runner.v1);

function main() {
  // const client = new runner.v1.RunnerService(
  //   '192.168.50.100:3000',
  //   grpc.credentials.createInsecure(),
  // );

  // const client = new hello_proto.helloworld.Greeter(
  //   'localhost:50051',
  //   grpc.credentials.createInsecure(),
  // );

  // console.log('RegisterRequest', runner.v1.RegisterRequest);

  // const reg = client.Register({
  //   name: 'test_runner',
  //   token: 'tOCwFvUOIFYzQCnc7MVt3z0OwEewLAhTUyZ4TUTv',
  //   agent_labels: [],
  //   version: '0.0.1',
  //   labels: [],
  // }, (err, response) => {
  //   console.log(err, response);
  // });

  // client.sayHello({ name: 'ddd' }, (err, response) => {
  //   console.log('Greeting:', response.message);
  // });
}

main();

const options = {
  hostname: '192.168.50.100',
  port: 3000,
  path: '/api/actions/runner.v1.RunnerService/Register',
  method: 'POST',
  headers: {},
};
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
