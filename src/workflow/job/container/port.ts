import url from 'node:url';

export interface ExposedPorts {
  [port: string]: {}
}

export interface PortBindings {
  [port: string]: { HostIp: string, HostPort: string }[]
}

export default class Port {
  #value;

  constructor(value: string) {
    this.#value = value;
  }

  toString() {
    return this.#value;
  }

  toJSON() {
    return this.#value;
  }

  parse() {
    return Port.Parse(this.#value);
  }

  // IP:HostPort:ContainerPort
  static Split(portInfo: string = '') {
    const [containerPort = '', HostPort = '', ...ips] = portInfo.split(':').reverse();
    return [ips.reverse().join(':'), HostPort, containerPort];
  }

  // Port/Protocol -> [protocol, port]
  static SplitProtocolPort(portInfo: string = '') {
    const [port, protocol = 'tcp'] = portInfo.split('/');

    if (!port) {
      throw new Error((`No port specified: ${port}<empty>`));
    }

    return [protocol, port];
  }

  static ParsePortRange(ports: string) {
    if (!ports) {
      throw new Error('Empty string specified for ports.');
    }

    if (!ports.includes('-')) {
      const startInt = Number(BigInt(ports));
      return [startInt, startInt];
    }

    const [start, end] = ports.split('-');

    if (start === '' || end === '') {
      throw new Error(`Invalid port range: ${ports}`);
    }

    const startInt = Number(BigInt(start));
    const endInt = Number(BigInt(end));

    // if (startInt < 1 || endInt < 1) {
    //   throw new Error(`Invalid port range: ${ports}`);
    // }

    if (endInt < startInt) {
      throw new Error(`Invalid range specified for the Port: ${ports}`);
    }

    return [startInt, endInt];
  }

  static ValidateProto(proto: string) {
    return ['tcp', 'udp', 'sctp'].includes(proto.toLowerCase());
  }

  static SplitHostPort(address: string) {
    try {
      const parsed = url.parse(`http://${address}`);
      if (!parsed.hostname) {
        throw new Error(`Invalid address: ${address}`);
      }

      if (!parsed.port) {
        return [parsed.hostname, ''];
      }

      return [parsed.hostname, parsed.port.startsWith(':') ? parsed.port.slice(1) : parsed.port];
    } catch (err) {
      return ['', ''];
    }
  }

  static Parse(portInfo: string) {
    const [rawIp, hostPort, containerProtocolPort] = this.Split(portInfo);
    const [protocol, containerPort] = this.SplitProtocolPort(containerProtocolPort);

    const [ip] = this.SplitHostPort(`${rawIp}:`);

    const [startPort, endPort] = this.ParsePortRange(containerPort);

    let startHostPort = 0;
    let endHostPort = 0;
    if (hostPort) {
      [startHostPort, endHostPort] = this.ParsePortRange(hostPort);
    }

    if (hostPort !== '' && (endPort - startPort) !== (endHostPort - startHostPort)) {
      // Allow host port range iff containerPort is not a range.
      // In this case, use the host port range as the dynamic
      // host port range to allocate into.
      if (endPort !== startPort) {
        throw new Error(`Invalid ranges specified for container and host Ports: ${containerPort} and ${hostPort}`);
      }
    }

    if (!this.ValidateProto(protocol.toLowerCase())) {
      throw new Error(`Invalid proto: ${protocol}`);
    }
    const portMappings = [];

    for (let i = 0; i <= endPort - startPort; i++) {
      const containerPortStr = startPort + i;
      let hostPortStr = hostPort;
      if (hostPort) {
        hostPortStr = String(startHostPort + i);
      }
      // Set hostPort to a range only if there is a single container port
      // and a dynamic host port.
      if (startPort === endPort && startHostPort !== endHostPort) {
        hostPortStr = `${hostPort}-${endHostPort}`;
      }

      const port = `${containerPortStr}/${protocol}`;

      const bind = {
        HostIp: ip,
        HostPort: hostPortStr,
      };

      portMappings.push({
        port,
        bind,
      });
    }
    return portMappings;
  }

  static ParsePorts(ports: string[] = []) {
    const exposedPorts: ExposedPorts = {};
    const portBindings: PortBindings = {};

    for (const rawPort of ports) {
      try {
        const portMappings = this.Parse(rawPort);
        for (const { port, bind } of portMappings) {
          const portStr = port.toString();
          if (!exposedPorts[portStr]) {
            exposedPorts[portStr] = {};
          }
          const currentBindings = portBindings[portStr] || [];
          portBindings[portStr] = [...currentBindings, bind];
        }
      } catch (err) {
        // console.log('err', err);
      }
    }

    return { exposedPorts, portBindings };
  }
}
