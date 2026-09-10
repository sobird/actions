import chalk, { ChalkInstance } from 'chalk';
import winston from 'winston';

import { storage, getLogger, withLogger, getLoggerHook, type LoggerCallback } from '@/common/logger';
import Config from '@/runner/config';
import { cycle } from '@/utils/index.ts';

const colorIterator = cycle([chalk.blue, chalk.yellow, chalk.green, chalk.magenta, chalk.red, chalk.gray, chalk.cyan]);

/**
 * 自定义格式化器：Job Log 格式化输出
 *
 * @param color
 * @param logPrefixJobID
 * @returns
 */
const jobLogFormat = (color: ChalkInstance, logPrefixJobID?: boolean) =>
  winston.format.printf((info) => {
    let msg = String(info.message).replace(/\n$/, '');

    const job = logPrefixJobID ? info.jobID : info.job;
    const debugFlag = info.level === 'debug' ? '[DEBUG] ' : '';

    if (info.verbatim === true) {
      return `${color(`[${job}]`)} | ${msg}`;
    } else if (info.dryrun === true) {
      return `${chalk.gray('*DRYRUN*')} ${color(`[${job}]`)} ${debugFlag}${msg}`;
    } else {
      return `${color(`[${job}]`)} ${debugFlag}${msg}`;
    }
  });

export function withJobLogger<T>(
  jobID: string,
  jobName: string,
  config: Config,
  matrix: Record<string, any>,
  callback: LoggerCallback<T>,
): T {
  const store = storage.getStore() || {};
  let logger: winston.Logger;

  if (store.jobLoggerFactory) {
    logger = store.jobLoggerFactory.withJobLogger();
  } else {
    let formatter: winston.Logform.Format;

    if (config.logJson) {
      formatter = winston.format.json();
    } else {
      formatter = jobLogFormat(colorIterator.next().value, config.logPrefixJobId);
    }

    logger = winston.createLogger({
      level: config.jobLoggerLevel,
      transports: [new winston.transports.Console()],
      format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), formatter),
    });
  }

  const hook = getLoggerHook();
  if (hook) {
    logger.on('data', (info) => {
      hook?.fire(info);
    });
  }

  // 每个 job 拥有独立的 step 作用域：stepId 栈在 job 内按 step 重置/按 composite 累积
  const childLogger = logger.child({
    job: jobName,
    jobID: jobID,
    dryrun: store.dryrun ?? false,
    matrix: matrix,
  });

  return storage.run(
    {
      ...store,
      logger: childLogger,
      stepNumber: undefined,
      stepIds: [],
    },
    () => callback(childLogger),
  );
}

export function withCompositeLogger<T>(callback: LoggerCallback<T>): T {
  return withLogger(getLogger().child({}), callback);
}

export function withCompositeStepLogger<T>(stepId: string, callback: LoggerCallback<T>): T {
  const store = storage.getStore() || {};
  const stepIds = [...(store.stepIds ?? [])];
  stepIds.push(stepId);

  return storage.run(
    {
      ...store,
      logger: getLogger().child({ stepID: stepIds }),
      stepIds,
    },
    () => callback(getLogger()),
  );
}

export function withStepLogger<T>(
  stepNumber: number,
  stepId: string,
  stepName: string,
  stageName: string,
  callback: LoggerCallback<T>,
): T {
  const store = storage.getStore() || {};

  return storage.run(
    {
      ...store,
      logger: getLogger().child({
        stepNumber: String(stepNumber),
        step: stepName,
        stage: stageName,
      }),
      stepNumber: String(stepNumber),
      stepIds: [stepId],
    },
    () => callback(getLogger()),
  );
}

export function getStepNumber(): string | undefined {
  return storage.getStore()?.stepNumber;
}
