import { IncomingMessage } from 'node:http';

import jwt from 'jsonwebtoken';

import { createAuthorizationToken, parseAuthorizationRequest, parseAuthorizationToken } from './auth';

const taskID = 23;
const runID = 1;
const jobID = 2;

// auth.ts 在模块加载时读取一次密钥，这里按同样的表达式复现，以便自行签发测试令牌
const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET';

function authorizationRequest(header?: string): IncomingMessage {
  return { headers: header === undefined ? {} : { authorization: header } } as IncomingMessage;
}

describe('createAuthorizationToken', () => {
  test('writes the claims a runner runtime token carries', () => {
    const claims = jwt.decode(createAuthorizationToken(taskID, runID, jobID)) as Record<string, unknown>;

    expect(claims.scp).toBe(`Actions.Results:${runID}:${jobID}`);
    expect(claims.taskID).toBe(taskID);
    expect(claims.runID).toBe(runID);
    expect(claims.jobID).toBe(jobID);
    expect((claims.exp as number) - (claims.nbf as number)).toBe(24 * 60 * 60);
  });

  test('writes an ac claim that buildx gha cache can parse', () => {
    const claims = jwt.decode(createAuthorizationToken(taskID, runID, jobID)) as Record<string, string>;
    const scopes = JSON.parse(claims.ac) as Array<{ scope: string; permission: number }>;

    expect(scopes.length).toBeGreaterThanOrEqual(1);
    expect(scopes[0].scope).toBe('');
    expect(scopes[0].permission).toBe(2); // ActionsCachePermission.Write
  });
});

describe('parseAuthorizationToken', () => {
  test('round-trips the taskID', () => {
    expect(parseAuthorizationToken(createAuthorizationToken(taskID, runID, jobID))).toBe(taskID);
  });

  test('rejects a token without a taskID claim', () => {
    const token = jwt.sign({ scp: `Actions.Results:${runID}:${jobID}` }, JWT_SECRET);
    expect(() => parseAuthorizationToken(token)).toThrow(/invalid token claim/);
  });

  test('rejects a token signed with another secret', () => {
    const token = jwt.sign({ taskID }, 'some-other-secret');
    expect(() => parseAuthorizationToken(token)).toThrow(/invalid token claim/);
  });

  test('rejects a token that is not a JWT', () => {
    expect(() => parseAuthorizationToken('not-a-jwt')).toThrow(/invalid token claim/);
  });
});

describe('parseAuthorizationRequest', () => {
  test('returns null when the request carries no authorization header', () => {
    expect(parseAuthorizationRequest(authorizationRequest())).toBeNull();
  });

  test('returns the taskID of a bearer token', () => {
    const token = createAuthorizationToken(taskID, runID, jobID);
    expect(parseAuthorizationRequest(authorizationRequest(`Bearer ${token}`))).toBe(taskID);
  });

  test('throws when the header cannot be split', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseAuthorizationRequest(authorizationRequest('Bearer'))).toThrow('split token failed');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test('throws when the bearer token is empty', () => {
    expect(() => parseAuthorizationRequest(authorizationRequest('Bearer '))).toThrow(/invalid token claim/);
  });
});
