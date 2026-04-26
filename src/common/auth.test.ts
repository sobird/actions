// authorization.test.js
import express from 'express';
import jwt from 'jsonwebtoken';

import { createAuthorizationToken, parseAuthorizationToken, ActionsCacheScope } from './auth';

describe('Authorization Tests', () => {
  test('Test Create Authorization Token', () => {
    const taskID = 23;
    const token = createAuthorizationToken(taskID, 1, 2);
    expect(token).not.toBeNull();
    expect(token).not.toEqual('');

    const decoded = jwt.decode(token)!;
    console.log('decoded', decoded);
    expect(decoded).toHaveProperty('scp');
    expect(decoded.scp).toContain('Actions.Results:1:2');
    expect(decoded).toHaveProperty('taskID');
    expect(decoded.taskID).toBe(taskID);
    expect(decoded).toHaveProperty('ac');
    const ac = JSON.parse(decoded.ac);
    console.log('ac', ac);
    // expect(ac.).toBe(JSON.stringify([{ scope: 'Actions.Results:1:2' }]));
  });

  // test('Test Parse Authorization Token', () => {
  //   const taskID = 23;
  //   const token = createAuthorizationToken(taskID, 1, 2);
  //   const req = express.Request();
  //   req.headers = { authorization: `Bearer ${token}` };

  //   const parsedTaskID = parseAuthorizationToken(req);
  //   expect(parsedTaskID).toBe(taskID);
  // });

  // test('Test Parse Authorization Token with No Auth Header', () => {
  //   const req = express.Request();
  //   req.headers = {};

  //   const parsedTaskID = parseAuthorizationToken(req);
  //   expect(parsedTaskID).toBeNull();
  // });
});
