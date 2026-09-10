import { AsyncLocalStorage } from 'node:async_hooks';

import winston from 'winston';

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

export type LogLevel = keyof RemoveIndexSignature<winston.config.CliConfigSetLevels>;

// verbatim 不能作为 info 的第二个参数传入：format.splat() 会把额外参数用于
// 对含 %s 占位符的消息做 util.format 插值，改坏日志内容。用 child logger 的
// 默认元数据携带 verbatim，使其不进入 splat 插值流程。
export interface LoggerChild {
  verbatim?: boolean;

  stage?: string;
  jobResult?: string;
  stepResult?: string;
  stepNumber?: string;
}

export interface LogEntry extends LoggerChild, winston.Logform.TransformableInfo {
  timestamp: string;
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
  hook?: LoggerHook;
  jobLoggerFactory?: JobLoggerFactory;
  dryrun?: boolean;
  stepNumber?: string;
  stepIds?: string[];
}

export const storage = new AsyncLocalStorage<LoggerContext>();

const colorizer = winston.format.colorize();
const defaultLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.splat(),
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

export function getLoggerHook() {
  const store = storage.getStore() || {};
  return store?.hook;
}

export function withLoggerHook<T>(hook: LoggerHook, callback: () => T): T {
  const store = storage.getStore() || {};

  return storage.run(
    {
      ...store,
      hook,
    },
    callback,
  );
}

export default defaultLogger;
