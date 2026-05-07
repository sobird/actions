import { setTimeout } from 'node:timers/promises';

export async function withTimeout<T>(awaited: Promise<T> | T, ms?: number, message: string = 'Operation timed out') {
  const ac = new AbortController();
  const signal = ac.signal;

  const timeoutPromise = setTimeout(ms, null, { signal }).then(() => {
    throw new Error(message);
  });

  try {
    return await Promise.race([awaited, timeoutPromise]);
  } finally {
    ac.abort();
  }
}
