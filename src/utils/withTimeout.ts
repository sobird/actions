import { setTimeout } from 'node:timers/promises';

export async function withTimeout<T>(
  awaited: ((signal: AbortSignal) => Promise<T> | T) | Promise<T> | T,
  ms: number = 1000,
  message: string = `Operation timed out after ${ms}ms`,
) {
  const ac = new AbortController();
  const signal = ac.signal;

  const awaitedPromise: T = typeof awaited === 'function' ? (awaited as Function)(signal) : awaited;

  const timeoutPromise = setTimeout(ms, null, { signal }).then(() => {
    throw new Error(message);
  });

  try {
    return await Promise.race([awaitedPromise, timeoutPromise]);
  } finally {
    ac.abort();
  }
}
