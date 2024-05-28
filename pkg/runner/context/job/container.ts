export class Container {
  image: string;

  credentials: {
    username: string;
    password: string;
  };

  env: object;

  /**
   * The exposed ports of the service container.
   */
  ports: Record<string, string>;

  volumes: Record<string, string>;

  options: string[];

  /**
   * The ID of the service container.
   */
  id: string;

  /**
   * The ID of the service container network.
   * The runner creates the network used by all containers in a job.
   */
  network: string;

  constructor(container: Container) {
    this.image = container.image;
    this.credentials = container.credentials;
    this.env = container.env;
    this.ports = container.ports;
    this.volumes = container.volumes;
    this.options = container.options;
    this.id = container.id;
    this.network = container.network;
  }
}
