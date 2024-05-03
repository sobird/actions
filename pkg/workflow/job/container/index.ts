/**
 * ContainerSpec is the specification of the container to use for the job
 *
 * sobird<i@sobird.me> at 2024/05/02 21:41:14 created.
 */

export interface Container {
  /**
   * 定义要用作运行操作的容器的 Docker 映像。 值可以是 Docker Hub 映像名称或注册表名称。
   *
   * jobs.<job_id>.container.image
   */
  image: string;
  env: { [key: string]: string };
  ports: string[];
  volumes: string[];
  options: string;
  credentials: { [key: string]: string };
  entrypoint: string;
  args: string;
  name: string;
  reuse: boolean;
  /** 特定于 Gitea 的字段 */
  cmd: string[];
}
