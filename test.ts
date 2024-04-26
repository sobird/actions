import retry from 'retry';

const timeouts = retry.timeouts();

async function faultTolerantResolve(address, cb) {
  const operation = retry.operation();

  operation.attempt(async (currentAttempt) => {
    console.log('currentAttempt', currentAttempt);
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (currentAttempt > 3) {
          resolve(address);
        } else {
          reject(Error('dddd'));
        }
      }, 1000);
    }).then((res) => {
      cb(operation.mainError(), address);
    }).catch((err) => {
      console.log('retry', operation.retry(err));
    });
  });
}

await faultTolerantResolve('nodejs.org', (err, addresses) => {
  console.log(err, addresses);
});

console.log('timeouts', timeouts);
