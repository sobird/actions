export class Container {
  /**
   * The ID of the service container.
   */
  id: string;

  /**
   * The ID of the service container network.
   * The runner creates the network used by all containers in a job.
   */
  network: string;

  /**
   * The exposed ports of the service container.
   */
  ports: Record<string, string>;

  constructor(container: Container) {
    this.id = container.id;
    this.network = container.network;
    this.ports = container.ports ?? {};
  }
}
