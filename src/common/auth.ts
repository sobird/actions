import { IncomingMessage } from 'node:http';

import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET';

// 定义 actionsClaims 结构
// class ActionsClaims {
//   constructor(registeredClaims, scp, taskID, runID, jobID, ac) {
//     this.registeredClaims = registeredClaims;
//     this.scp = scp;
//     this.taskID = taskID;
//     this.runID = runID;
//     this.jobID = jobID;
//     this.ac = ac;
//   }
// }

// 定义 actionsCacheScope 结构
export class ActionsCacheScope {
  constructor(
    public scope: string,
    public permission: number,
  ) {}
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
  const ac = JSON.stringify([new ActionsCacheScope('', ActionsCachePermission.Write)]);

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
  const token = jwt.sign(claims, JWT_SECRET, { algorithm: 'HS256' });
  return token;
}

export function parseAuthorizationRequest(req: IncomingMessage) {
  const h = req.headers.authorization;
  if (!h) {
    return null; // 认证方法不适用
  }

  const parts = h.split(' ', 2);
  if (parts.length !== 2) {
    console.error(`split token failed: ${h}`);
    throw new Error('split token failed');
  }

  return parseAuthorizationToken(parts[1]);
}

// 解析授权令牌
export function parseAuthorizationToken(token: string) {
  try {
    // 验证并解析 JWT
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    if (!payload || !payload.taskID) {
      throw new Error('invalid token claim');
    }

    return {
      userId: payload.userId,
      scope: payload.scope,
      actionsUserTaskId: payload.actionsUserTaskId,
    };
  } catch (err) {
    throw new Error(`invalid token claim: ${(err as Error).message}`, { cause: err });
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
