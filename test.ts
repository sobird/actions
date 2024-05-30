import { Mutex } from 'async-mutex';

import Executor from './pkg/common/executor';

// 创建一个新的互斥锁
const mutex = new Mutex();

// 假设的数据库查询函数
async function dbQuery() {
  // 模拟一个异步数据库查询
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Database query result');
    }, 1000);
  });
}

function dbQueryExecutor() {
  return Executor.mutex(new Executor(async () => {
    const result = await dbQuery();
    console.log('Result:', result);
  }));
}

async function someAsyncTask() {
  // 使用互斥锁的异步方法 'lock' 获取锁
  const release = await mutex.acquire();

  try {
    // 在此处执行需要互斥访问的代码
    // 例如，一个需要同步访问的异步数据库操作
    console.log('Performing critical section');
    // 假设我们有一个异步函数 dbQuery 来执行数据库查询
    const result = await dbQuery();
    console.log('Result:', result);
  } catch (err) {
    // 如果发生错误，输出错误信息
    console.error('An error occurred:', err);
  } finally {
    // 最后，释放锁
    // 无论 try 块中的代码是否成功执行，finally 块都会执行
    release();
  }
}

await Executor.parallel(2, dbQueryExecutor(), dbQueryExecutor(), dbQueryExecutor(), dbQueryExecutor()).execute();
