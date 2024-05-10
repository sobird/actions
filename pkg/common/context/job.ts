export interface Container {
  image: string;
  credentials: {
    username: string;
    password: string;
  }
  env: object;
  ports: Record<string, string>;
  volumes: Record<string, string>;
  options: string[];
  /**
     * 容器的 ID。
     */
  id: string;
  /**
   * 容器网络的 ID。 运行程序创建作业中所有容器使用的网络。
   */
  network: string;
}

/**
 * job 上下文包含当前正在运行的作业相关信息。
 *
 * 此上下文针对工作流程运行中的每项作业而改变。 您可以从作业中的任何步骤访问此上下文
 *
 * @example
 * ```json
 * {
 *   "status": "success",
 *   "container": {
 *     "network": "github_network_53269bd575974817b43f4733536b200c"
 *    },
 *   "services": {
 *     "postgres": {
 *       "id": "60972d9aa486605e66b0dad4abb638dc3d9116f566579e418166eedb8abb9105",
 *       "ports": {
 *         "5432": "49153"
 *        },
 *       "network": "github_network_53269bd575974817b43f4733536b200c"
 *      }
 *   }
 * }
 * ```
 */
export interface Job {
  /**
   * 作业的容器相关信息。 有关容器的详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontainer GitHub Actions 的工作流语法}”。
   */
  container: Container
  /**
   * 为作业创建的服务容器
   */
  services: Record<string, Container>;
  /**
   * 作业的当前状态。
   *
   * 可能的值为 `success`、`failure` 或 `cancelled`。
   */
  status: string;
}
