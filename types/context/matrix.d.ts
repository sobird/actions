/**
 * 对于具有矩阵的工作流，`matrix` 上下文包含工作流程文件中定义的适用于当前作业的矩阵属性。
 *
 * 例如，如果使用 `os` 和 `node` 键配置矩阵，则 `matrix` 上下文对象包含 `os` 和 `node` 属性，该属性具有用于当前作业的值。
 * `matrix` 上下文中没有标准属性，只有工作流文件中定义的属性。
 *
 * @example
 * {
 *  "os": "ubuntu-latest",
 *  "node": 16
 * }
 */
export type Matrix = Record<string, string[]>;
