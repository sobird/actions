/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/**
 * strategy.ts
 *
 * sobird<i@sobird.me> at 2024/05/06 3:18:36 created.
 */

import { cartesianProduct, lodash } from '@/utils';

export interface StrategyProps extends Pick<Strategy, 'matrix' | 'fail-fast' | 'max-parallel'> {}

export default class Strategy {
  /**
   * Use `jobs.<job_id>.strategy.matrix` to define a matrix of different job configurations.
   * Within your matrix, define one or more variables followed by an array of values.
   * For example, the following matrix has a variable called `version` with the value `[10, 12, 14]` and a variable called `os` with the value `[ubuntu-latest, windows-latest]`:
   *
   * ```yaml
   * jobs:
   *   example_matrix:
   *   strategy:
   *     matrix:
   *       version: [10, 12, 14]
   *       os: [ubuntu-latest, windows-latest]
   * ```
   *
   * A job will run for each possible combination of the variables.
   * In this example, the workflow will run six jobs, one for each combination of the `os` and `version` variables.
   *
   * By default, GitHub will maximize the number of jobs run in parallel depending on runner availability.
   * The order of the variables in the matrix determines the order in which the jobs are created.
   * The first variable you define will be the first job that is created in your workflow run.
   * For example, the above matrix will create the jobs in the following order:
   * * `{version: 10, os: ubuntu-latest}`
   * * `{version: 10, os: windows-latest}`
   * * `{version: 12, os: ubuntu-latest}`
   * * `{version: 12, os: windows-latest}`
   * * `{version: 14, os: ubuntu-latest}`
   * * `{version: 14, os: windows-latest}`
   *
   * A matrix will generate a maximum of 256 jobs per workflow run.
   * This limit applies to both GitHub-hosted and self-hosted runners.
   *
   * The variables that you define become properties in the `matrix` context,
   * and you can reference the property in other areas of your workflow file.
   * In this example, you can use `matrix.version` and `matrix.os` to access the current value of `version` and `os` that the job is using.
   * For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts Contexts}."
   */
  matrix: {
    /**
     * Use `jobs.<job_id>.strategy.matrix.include` to expand existing matrix configurations or to add new configurations.
     * The value of `include` is a list of objects.
     *
     * For each object in the `include` list,
     * the key:value pairs in the object will be added to each of the matrix combinations if none of the key:value pairs overwrite any of the original matrix values.
     * If the object cannot be added to any of the matrix combinations, a new matrix combination will be created instead.
     * Note that the original matrix values will not be overwritten,
     * but added matrix values can be overwritten.
     */
    include?: Record<string, string>[];
    /**
     * To remove specific configurations defined in the matrix, use `jobs.<job_id>.strategy.matrix.exclude`.
     * An excluded configuration only has to be a partial match for it to be excluded.
     * For example, the following workflow will run nine jobs: one job for each of the 12 configurations,
     * minus the one excluded job that matches `{os: macos-latest, version: 12, environment: production}`,
     * and the two excluded jobs that match `{os: windows-latest, version: 16}`.
     *
     * **Note:** All `include` combinations are processed after `exclude`.
     * This allows you to use include to add back combinations that were previously excluded.
     */
    exclude?: Record<string, string>[];
  } & {
    [key: string]: unknown[];
  };

  /**
   * You can control how job failures are handled with `jobs.<job_id>.strategy.fail-fast` and `jobs.<job_id>.continue-on-error`.
   *
   * `jobs.<job_id>.strategy.fail-fast` applies to the entire matrix.
   * If `jobs.<job_id>.strategy.fail-fast` is set to `true` or its expression evaluates to `true`,
   * GitHub will cancel all in-progress and queued jobs in the matrix if any job in the matrix fails.
   * This property defaults to `true`.
   *
   * `jobs.<job_id>.continue-on-error` applies to a single job.
   * If `jobs.<job_id>.continue-on-error` is `true`,
   * other jobs in the matrix will continue running even if the job with `jobs.<job_id>.continue-on-error: true` fails.
   *
   * You can use `jobs.<job_id>.strategy.fail-fast` and `jobs.<job_id>.continue-on-error` together.
   * For example, the following workflow will start four jobs.
   * For each job, `continue-on-error` is determined by the value of `matrix.experimental`.
   * If any of the jobs with `continue-on-error: false` fail,
   * all jobs that are in progress or queued will be cancelled.
   * If the job with `continue-on-error: true `fails, the other jobs will not be affected.
   */
  'fail-fast'?: boolean;

  /**
 * By default, GitHub will maximize the number of jobs run in parallel depending on runner availability.
 * To set the maximum number of jobs that can run simultaneously when using a `matrix` job strategy, use `jobs.<job_id>.strategy.max-parallel`.
 *
 * For example, the following workflow will run a maximum of two jobs at a time,
 * even if there are runners available to run all six jobs at once.
 *
 * ```yaml
 * jobs:
 *   example_matrix:
 *     strategy:
 *       max-parallel: 2
 *       matrix:
 *         version: [10, 12, 14]
 *         os: [ubuntu-latest, windows-latest]
 * ```
 */
  'max-parallel'?: number;

  constructor(strategy: StrategyProps = {} as StrategyProps) {
    this.matrix = strategy.matrix;
    this['fail-fast'] = strategy['fail-fast'];
    this['max-parallel'] = strategy['max-parallel'];
  }

  get FailFast() {
    const failFast = this['fail-fast'];
    if (typeof failFast === 'boolean') {
      return failFast;
    }
    return Boolean(failFast || true);
  }

  get MaxParallel() {
    return this['max-parallel'] || 1;
  }

  get Matrices() {
    if (!this.matrix) {
      return [];
    }
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

  /**
   * 筛选出所有与 targetMatrix 中指定的允许值匹配的矩阵。
   *
   * @param targetMatrix
   * @returns
   */
  selectMatrices(targetMatrix: Record<string, unknown[]> = {}) {
    const originalMatrices = this.Matrices;
    const matrices: Record<string, unknown>[] = [];
    originalMatrices.forEach((original) => {
      const isAllowed = Object.keys(original).every((key) => {
        const val = original[key];
        const allowedVals = targetMatrix[key];
        if (!allowedVals) return true;
        const valToString = String(val);
        return allowedVals.includes(valToString);
      });
      if (isAllowed) {
        matrices.push(original);
      }
    });
    return matrices;
  }
}
