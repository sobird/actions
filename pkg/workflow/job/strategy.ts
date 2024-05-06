/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/**
 * strategy.ts
 *
 * sobird<i@sobird.me> at 2024/05/06 3:18:36 created.
 */

import os from 'node:os';

import { cartesianProduct, lodash } from '@/utils';

interface StrategyAttrs {
/**
   * 使用 `jobs.<job_id>.strategy.matrix` 定义不同作业配置的矩阵。 在矩阵中，定义一个或多个变量，后跟一个值数组。
   *
   * 例如，以下矩阵有一个称为 version 的变量，其值为 [10, 12, 14] ，以及一个称为 os 的变量，其值为 [ubuntu-latest, windows-latest]：
   *
   * @example
   * ```yaml
   * jobs:
   *   example_matrix:
   *   strategy:
   *     matrix:
   *       version: [10, 12, 14]
   *       os: [ubuntu-latest, windows-latest]
   * ```
   *
   * 矩阵在每次工作流运行时最多将生成 256 个作业。 此限制适用于 GitHub 托管和自托管运行器。
   */
  matrix: {
    include?: Record<string, string>[];
    exclude?: Record<string, string>[];
  } & {
    [key: string]: unknown[];
  };

  /**
 * 你可以使用 `jobs.<job_id>.strategy.fail-fast `和 `jobs.<job_id>.continue-on-error` 来控制如何处理作业失败。
 *
 * `jobs.<job_id>.strategy.fail-fast` 适用于整个矩阵。
 * 如果 `jobs.<job_id>.strategy.fail-fast` 设置为 `true`，或者其表达式计算结果为 `true`，
 * 则在矩阵中的任何作业失败的情况下，GitHub 将取消矩阵中所有正在进行和在队列中的作业。 此属性的默认值为 `true`。
 */
  'fail-fast'?: boolean;

  /**
 * 默认情况下，GitHub 将根据运行器的可用性将并行运行的作业数最大化。
 * 若要设置使用 matrix 作业策略时可以同时运行的最大作业数，请使用 `jobs.<job_id>.strategy.max-parallel`。
 */
  'max-parallel'?: number;
}

/**
 * 使用 `jobs.<job_id>.strategy` 对作业使用矩阵策略。
 *
 * 使用矩阵策略，可以在单个作业定义中使用变量自动创建基于变量组合的多个作业运行。
 * 例如，可以使用矩阵策略在某个语言的多个版本或多个操作系统上测试代码。
 */
export default class Strategy {
  matrix;

  'fail-fast';

  'max-parallel';

  constructor(strategy: StrategyAttrs) {
    this.matrix = strategy.matrix;
    this['fail-fast'] = strategy['fail-fast'];
    this['max-parallel'] = strategy['max-parallel'];
  }

  get matrices() {
    const { include, exclude, ...originalMatrix } = this.matrix;

    let matrixes = [];

    const includes: Record<string, string>[] = [];
    const extraIncludes: Record<string, string>[] = [];

    if (include) {
      include.forEach((includeItem) => {
        if (Array.isArray(includeItem)) {
          includeItem.forEach((item) => {
            let extraInclude = true;

            for (const key in item) {
              if (Object.prototype.hasOwnProperty.call(originalMatrix, key)) {
                includes.push(item);
                extraInclude = false;
                break;
              }
            }
            if (extraInclude) {
              extraIncludes.push(item);
            }
          });
        } else {
          let extraInclude = true;
          for (const k in includeItem) {
            if (Object.prototype.hasOwnProperty.call(originalMatrix, k)) {
              includes.push(includeItem);
              extraInclude = false;
              break;
            }
          }
          if (extraInclude) {
            extraIncludes.push(includeItem);
          }
        }
      });
    }

    const excludes: Record<string, string | true>[] = [];
    if (exclude) {
      exclude.forEach((item) => {
        const excludeEntry: Record<string, string> = {};
        for (const k in item) {
          if (Object.prototype.hasOwnProperty.call(originalMatrix, k)) {
            excludeEntry[k] = item[k];
          } else {
            throw new Error(`The workflow is not valid. Matrix exclude key "${k}" does not match any key within the matrix`);
          }
        }
        excludes.push(excludeEntry);
      });
    }

    // 计算原始矩阵笛卡尔积
    const matrixProduct = cartesianProduct(originalMatrix);

    // 添加到所有原始矩阵组合, 不会覆盖原始组合的任何部分
    extraIncludes.forEach((includeItem) => {
      matrixProduct.forEach((matrixItem) => {
        Object.assign(matrixItem, includeItem);
      });
    });

    // 将排除条件转换为一个可以快速检查的对象
    const excludesMap = excludes.reduce((acc, excludeItem) => {
      acc.set(JSON.stringify(excludeItem), true);
      return acc;
    }, new Map());

    matrixes = matrixProduct.reduce((acc, item) => {
      if (!excludesMap.has(JSON.stringify(item))) {
        acc.push(item);
      }
      return acc;
    }, [] as Record<string, unknown>[]);

    const matchIncludes: Record<string, string>[] = [];
    includes.forEach((includeItem) => {
      let matched = false;
      matrixes.forEach((matrixItem) => {
        if (lodash.isMatchBy(matrixItem, includeItem, originalMatrix)) {
          matched = true;
          Object.assign(matrixItem, includeItem);
        }
      });
      if (!matched) {
        matchIncludes.push(includeItem);
      }
    });

    matchIncludes.forEach((includeItem) => {
      matrixes.push(includeItem);
    });

    return matrixes;
  }

  get maxParallel() {
    return this['max-parallel'] || os.cpus().length;
  }

  set maxParallel(maxParallel: number) {
    this['max-parallel'] = maxParallel;
  }
}
