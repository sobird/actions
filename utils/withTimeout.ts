export async function withTimeout<T>(awaited: Promise<T> | T, ms?: number, message: string = 'Operation timed out') {
  const timer = setTimeout(() => {
    throw new Error(message);
  }, ms);

  try {
    return await awaited;
  } finally {
    clearTimeout(timer);
  }
}

// function someAsyncOperation() {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       resolve(new Error('Operation succeeded'));
//     }, 10000);
//   });
// }

// try {
//   const result = await withTimeout(someAsyncOperation(), 3000);
//   console.log('result', result);
// } catch (err) {
//   console.log('err', err);
// }
