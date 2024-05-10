/**
 * env 上下文包含已在工作流、作业或步骤中设置的变量。它不包含运行器进程继承的变量。
 *
 * 有关在工作流中设置变量的详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#env GitHub Actions 的工作流语法}”
 * 可以检索存储在 env 上下文中的变量的值，并在工作流文件中使用这些值。 可以在非 id 和 uses 键的工作流程步骤中，在任何键中使用 env 上下文。 有关步骤语法的详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps GitHub Actions 的工作流语法}”。
 * 如果想要在运行器中使用变量的值，请使用运行器操作系统的正常方法来读取环境变量。
 */
export type Env = Record<string, string>;
