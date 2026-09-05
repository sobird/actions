import chalk, { ChalkInstance } from 'chalk';
import winston from 'winston';

import {
  storage,
  getMasks,
  withMasks,
  getLogger,
  withLogger,
  getLoggerHook,
  type LoggerCallback,
} from '@/common/logger';
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

    if (info.raw_output === true) {
      return `${color(`[${job}]`)} | ${msg}`;
    } else if (info.dryrun === true) {
      return `${chalk.gray('*DRYRUN*')} ${color(`[${job}]`)} ${debugFlag}${msg}`;
    } else {
      return `${color(`[${job}]`)} ${debugFlag}${msg}`;
    }
  });

const maskedFormat = (config: Config) =>
  winston.format((info) => {
    if (config.insecureSecrets) {
      return info;
    }

    let message = String(info.message);

    // 静态 Secrets 脱敏
    if (config.context.secrets) {
      for (const v of Object.values(config.context.secrets)) {
        if (v) {
          message = message.replaceAll(v, '***');
        }
      }
    }

    // 来自 Context 的动态 Masks 脱敏
    const currentMasks = getMasks();
    for (const v of currentMasks) {
      if (v) {
        message = message.replaceAll(v, '***');
      }
    }

    info.message = message;
    return info;
  })();

export function withJobLogger<T>(
  jobID: string,
  jobName: string,
  config: Config,
  masks: string[],
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
      format: winston.format.combine(maskedFormat(config), formatter),
    });
  }

  const hook = getLoggerHook();
  if (hook) {
    logger.on('data', (info) => {
      hook?.fire(info);
    });
  }

  return withMasks(masks, () => {
    return withLogger(
      logger.child({
        job: jobName,
        jobID: jobID,
        dryrun: store.dryrun ?? false,
        matrix: matrix,
      }),
      callback,
    );
  });
}

export function withCompositeLogger<T>(masks: string[], callback: LoggerCallback<T>): T {
  return withMasks(masks, () => {
    return withLogger(getLogger().child({}), callback);
  });
}

export function withCompositeStepLogger<T>(stepId: string, callback: LoggerCallback<T>): T {
  const logger = getLogger();

  let stepIds: string[] = [];
  // 继承旧的 stepIds 数组
  if (logger && logger.defaultMeta.stepId) {
    stepIds = [...logger.defaultMeta.stepId];
  }

  stepIds.push(stepId);

  const childLogger = logger.child({});
  childLogger.defaultMeta = {
    stepId: [stepId],
  };

  return withLogger(childLogger, callback);
}

export function withStepLogger<T>(
  stepNumber: number,
  stepId: string,
  stepName: string,
  stageName: string,
  callback: LoggerCallback<T>,
): T {
  const childLogger = getLogger().child({
    stepNumber: String(stepNumber),
    step: stepName,
    stage: stageName,
  });

  childLogger.defaultMeta = {
    stepId: [stepId],
  };

  return withLogger(childLogger, callback);
}
