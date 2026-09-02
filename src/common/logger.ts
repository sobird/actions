import { AsyncLocalStorage } from 'node:async_hooks';

import winston from 'winston';

export interface LogEntry extends winston.Logform.TransformableInfo {
  timestamp: string;

  stage?: string;
  rawOutput?: boolean;
  jobResult?: string;
  stepResult?: string;
  stepNumber?: string;
}

export interface LoggerHook {
  fire(entry: LogEntry): void;
}

export type LoggerCallback<T> = (logger: winston.Logger) => T;

export interface JobLoggerFactory {
  withJobLogger(): winston.Logger;
}
export interface LoggerContext {
  logger?: winston.Logger;
  hook?: winston.Logform.Format | winston.transport;
  masks?: string[];
  jobLoggerFactory?: JobLoggerFactory;
  dryrun?: boolean;
}

export const storage = new AsyncLocalStorage<LoggerContext>();

const colorizer = winston.format.colorize();
const defaultLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      const paddedLevel = level.toUpperCase().padEnd(5);
      const colorized = colorizer.colorize(level, `[${paddedLevel}]`);
      const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';

      return `${timestamp} ${colorized} ${message}${meta}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export function getLogger(): winston.Logger {
  const store = storage.getStore();
  return store?.logger ?? defaultLogger;
}

export function withLogger<T>(logger: winston.Logger, callback: LoggerCallback<T>): T {
  const store = storage.getStore();

  return storage.run(
    {
      ...store,
      logger,
    },
    () => callback(logger),
  );
}

export function getLoggerHook(): winston.Logform.Format | winston.transport | undefined {
  const store = storage.getStore() || {};
  return store?.hook;
}

export function withLoggerHook<T>(hook: winston.Logform.Format | winston.transport, callback: () => T): T {
  const store = storage.getStore() || {};

  return storage.run(
    {
      ...store,
      hook,
    },
    callback,
  );
}

export function getMasks(): string[] {
  const store = storage.getStore();
  return store?.masks ?? [];
}

export function withMasks<T>(masks: string[], callback: () => T): T {
  const store = storage.getStore() || {};
  return storage.run({ ...store, masks }, callback);
}

export default defaultLogger;
