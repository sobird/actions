export async function withTimeout<T>(awaited: Promise<T>, ms?: number) {
  const timer = setTimeout(() => {
    throw new Error('Operation timed out');
  }, ms);

  try {
    await awaited;
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
