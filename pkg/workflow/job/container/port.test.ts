import Port from './port';

describe('Nat test', () => {
  it('Port.Split test case', () => {
    const portInfo = '192.168.1.100:8080-8090:80-90/udp';
    const res = Port.Split(portInfo);
    expect(res).toEqual(['192.168.1.100', '8080-8090', '80-90/udp']);
  });

  it('Port.SplitProtocolPort test case', () => {
    const portInfo = '80-90/udp';
    const res = Port.SplitProtocolPort(portInfo);
    expect(res).toEqual(['udp', '80-90']);
  });
});

describe('Port.ParsePortRange test case', () => {
  it('port: empty value', () => {
    expect(() => {
      (Port.ParsePortRange as any)();
    }).toThrow('Empty string specified for ports.');
  });

  it('port: 80-90', () => {
    const ports = '80-90';
    const res = Port.ParsePortRange(ports);
    expect(res).toEqual([80, 90]);
  });

  it('port: 80-', () => {
    const ports = '80-';
    const res = Port.ParsePortRange(ports);
    expect(res).toEqual([80, 80]);
  });

  it('port: -90', () => {
    const ports = '-90';
    const res = Port.ParsePortRange(ports);
    expect(res).toEqual([90, 90]);
  });

  it('port: 80', () => {
    const ports = '80';
    const res = Port.ParsePortRange(ports);
    expect(res).toEqual([80, 80]);
  });

  it('port: " "', () => {
    const ports = ' ';
    expect(() => {
      Port.ParsePortRange(ports);
    }).toThrow(`Invalid port range:${ports}`);
  });
});

describe('Port.SplitHostPort test case', () => {
  it('address: " "', () => {
    const address = ' ';

    expect(() => {
      Port.SplitHostPort(address);
    }).toThrow(`Invalid address:${address}`);
  });

  it('address: 192.168.1.100:8080', () => {
    const address = '192.168.1.100:8080';
    const res = Port.SplitHostPort(address);
    expect(res).toEqual(['192.168.1.100', '8080']);
  });

  it('address: [::1]:80', () => {
    const address = '[::1]:80';
    const res = Port.SplitHostPort(address);
    expect(res).toEqual(['::1', '80']);
  });
});

describe('Port.Parse', () => {
  it('portInfo: 192.168.1.100:8080-8090:80-82/udp', () => {
    const portInfo = '192.168.1.100:8080-8090:80-82/udp';
    const res = Port.Parse(portInfo);

    expect(res).toEqual([
      {
        port: '80/udp',
        bind: { HostIp: '192.168.1.100', HostPort: '8080' },
      },
      {
        port: '81/udp',
        bind: { HostIp: '192.168.1.100', HostPort: '8081' },
      },
      {
        port: '82/udp',
        bind: { HostIp: '192.168.1.100', HostPort: '8082' },
      }]);
  });

  it('Port.ParsePorts test case', () => {
    const portInfo = '192.168.1.100:8080-8090:80-83/udp';
    const res = Port.ParsePorts([portInfo]);

    expect(res).toEqual({
      exposedPorts: {
        '80/udp': {},
        '81/udp': {},
        '82/udp': {},
        '83/udp': {},
      },
      portBindings: {
        '80/udp': [{
          HostIp: '192.168.1.100',
          HostPort: '8080',
        }],
        '81/udp': [{
          HostIp: '192.168.1.100',
          HostPort: '8081',
        }],
        '82/udp': [{
          HostIp: '192.168.1.100',
          HostPort: '8082',
        }],
        '83/udp': [{
          HostIp: '192.168.1.100',
          HostPort: '8083',
        }],
      },
    });
  });
});
