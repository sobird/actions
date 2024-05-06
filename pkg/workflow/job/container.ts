/**
 * Container is the specification of the container to use for the job
 *
 * sobird<i@sobird.me> at 2024/05/02 21:41:14 created.
 */

/**
 * the specification of the container to use for the job
 */
export default class Container {
  /**
   * 定义要用作运行操作的容器的 Docker 映像。 值可以是 Docker Hub 映像名称或注册表名称。
   *
   * jobs.<job_id>.container.image
   */
  image: string;

  /**
   * 如果映像的容器注册表需要身份验证才能拉取映像，
   * 可以使用 `jobs.<job_id>.container.credentials` 设置 `username` 和 `password` 的 `map`。
   * 凭据是你将提供给 `docker login` 命令的相同值。
   */
  credentials?: {
    username?: string;
    password?: string;
  };

  /**
   * 使用 `jobs.<job_id>.container.env` 以在容器中设置环境变量的 `map`。
   */
  env?: Record<string, string> = {};

  /**
   * 使用 `jobs.<job_id>.container.ports` 设置要在容器上显示的 `array` 个端口。
   */
  ports?: string[];

  /**
   * 使用 `jobs.<job_id>.container.volumes` 设置容器要使用的卷 `array`。
   *
   * 您可以使用卷分享作业中服务或其他步骤之间的数据。 可以指定命名的 Docker 卷、匿名的 Docker 卷或主机上的绑定挂载。
   * 要指定卷，需指定来源和目标路径：
   * * `<source>:<destinationPath>`。
   * * `<source>` 是主机上的卷名称或绝对路径，`<destinationPath>` 是容器中的绝对路径。
   */
  volumes?: string[];

  /**
   * 使用 `jobs.<job_id>.container.options` 配置其他 Docker 容器资源选项。 有关选项列表，请参阅“{@link https://docs.docker.com/engine/reference/commandline/create/#options docker create 选项}”。
   *
   * **警告：** 不支持 --network 和 --entrypoint 选项。
   */
  options?: string;

  entrypoint?: string;

  args?: string;

  name?: string;

  reuse?: boolean;

  /** 特定于 Gitea 的字段 */
  cmd?: string[];

  constructor(container: Container) {
    if (typeof container === 'string') {
      this.image = container;
      return;
    }
    this.image = container.image;
    this.credentials = container.credentials;
    this.env = container.env;
    this.ports = container.ports;
    this.volumes = container.volumes;
    this.options = container.options;
    this.entrypoint = container.entrypoint;
    this.args = container.args;
    this.name = container.name;
    this.reuse = container.reuse;
    this.cmd = container.cmd;
  }
}
