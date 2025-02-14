/* eslint-disable max-classes-per-file */

import { IncomingMessage } from 'node:http';

import jwt from 'jsonwebtoken';

import logger from './logger';

// 定义 actionsClaims 结构
class ActionsClaims {
  constructor(registeredClaims, scp, taskID, runID, jobID, ac) {
    this.registeredClaims = registeredClaims;
    this.scp = scp;
    this.taskID = taskID;
    this.runID = runID;
    this.jobID = jobID;
    this.ac = ac;
  }
}

// 定义 actionsCacheScope 结构
export class ActionsCacheScope {
  constructor(public scope: string, public permission: number) {}
}

// 定义权限常量
const ActionsCachePermission = {
  Read: 1 << 0,
  Write: 1 << 1,
};

// 创建授权令牌
export function createAuthorizationToken(taskID: number, runID: number, jobID: number) {
  const now = Math.floor(Date.now() / 1000); // 当前时间（秒）

  // 生成 ac 字段
  const ac = JSON.stringify([
    new ActionsCacheScope('', ActionsCachePermission.Write),
  ]);

  // 定义 claims
  const claims = {
    exp: now + 24 * 60 * 60, // 24 小时后过期
    nbf: now, // 当前时间生效
    scp: `Actions.Results:${runID}:${jobID}`,
    taskID,
    runID,
    jobID,
    ac,
  };

  // 使用 HS256 算法签名
  const token = jwt.sign(claims, 'dd', { algorithm: 'HS256' }); // 使用空密钥
  return token;
}

// 解析授权令牌
export function parseAuthorizationToken(req: IncomingMessage) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return 0; // 无 Authorization 头
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    logger.error(`split token failed: ${authHeader}`);
    throw new Error('split token failed');
  }

  try {
    // 验证并解析 JWT
    const token = jwt.verify(parts[1], '', { algorithms: ['HS256'] }); // 使用空密钥
    if (!token || !token.taskID) {
      throw new Error('invalid token claim');
    }

    return token.taskID;
  } catch (err) {
    logger.error(`JWT verification failed: ${err.message}`);
    throw new Error('invalid token');
  }
}

// 示例使用
// try {
//   const token = createAuthorizationToken(123, 456, 789);
//   console.log('Generated Token:', token);

//   const req = {
//     headers: {
//       authorization: `Bearer ${token}`,
//     },
//   };
//   const taskID = parseAuthorizationToken(req);
//   console.log('Parsed Task ID:', taskID);
// } catch (err) {
//   console.error('Error:', err.message);
// }
