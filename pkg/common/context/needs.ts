/**
 * needs 上下文包含定义为当前作业直接依赖项的所有作业的输出。
 * 请注意，这不包括隐式依赖作业（例如依赖作业的依赖作业）。
 */
export type Needs = Record<string, {
  outputs: object;
  result: 'success' | 'failure' | 'cancelled' | 'skipped';
}>;
