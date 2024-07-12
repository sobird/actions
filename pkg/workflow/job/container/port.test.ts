import Port from './port';

describe('Nat test', () => {
  const tests: [string, string[]][] = [
    ['192.168.1.100:8080-8090:80-90/udp', ['192.168.1.100', '8080-8090', '80-90/udp']],
    ['80-90/udp', ['', '', '80-90/udp']],
    ['[2001:4860:0:2001::68]::333', ['[2001:4860:0:2001::68]', '', '333']],
  ];

  tests.forEach((item) => {
    const [value, expected] = item;
    it(`Valid port info: ${value}`, () => {
      const res = Port.Split(value);
      expect(res).toEqual(expected);
    });
  });
});

describe('Port.ParsePortRange test case', () => {
  const validRanges = [
    ['1234', 1234, 1234],
    ['1234-1234', 1234, 1234],
    ['1234-1235', 1234, 1235],
    ['8000-9000', 8000, 9000],
    [' ', 0, 0],
    ['0', 0, 0],
    ['0-0', 0, 0],
    ['80-90', 80, 90],
    ['80', 80, 80],
  ];

  validRanges.forEach((item) => {
    const [range, ...result] = item;
    it(`ValidRanges: "${range}"`, () => {
      const res = Port.ParsePortRange(range as string);
      expect(res).toEqual(result);
    });
  });

  const invalidRanges = [
    '',
    'asdf',
    '9000-8000',
    '1asdf',
    '80-',
    '-90',
  ];

  invalidRanges.forEach((item) => {
    it(`InvalidRanges: "${item}"`, () => {
      expect(() => {
        const res = Port.ParsePortRange(item);
        console.log('InvalidRanges', res);
      }).toThrow(/* `Invalid port range: ${item}` */);
    });
  });
});

describe('Port.SplitHostPort test case', () => {
  it('address: " "', () => {
    const address = ' ';
    const res = Port.SplitHostPort(address);

    expect(res).toEqual(['', '']);
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

describe('Port.Parse test case', () => {
  const validTests = [
    [
      '192.168.1.100:8080-8082:80-82/udp',
      [
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
        },
      ],
    ],

    [
      '0.0.0.0:1234-1235:3333-3334/tcp',
      [
        {
          port: '3333/tcp',
          bind: {
            HostIp: '0.0.0.0',
            HostPort: '1234',
          },
        },
        {
          port: '3334/tcp',
          bind: {
            HostIp: '0.0.0.0',
            HostPort: '1235',
          },
        },
      ],
    ],
    [
      '[2001:4860:0:2001::68]::333',
      [
        {
          port: '333/tcp',
          bind: {
            HostIp: '2001:4860:0:2001::68',
            HostPort: '',
          },
        },
      ],
    ],
    [
      '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]::333',
      [
        {
          port: '333/tcp',
          bind: {
            HostIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            HostPort: '',
          },
        },
      ],
    ],
    [
      '[::1]:80:80',
      [
        {
          port: '80/tcp',
          bind: {
            HostIp: '::1',
            HostPort: '80',
          },
        },
      ],
    ],
  ];

  validTests.forEach((item) => {
    const [value, expected] = item;
    it(`Valid port info: ${value}`, () => {
      expect(Port.Parse(value as string)).toEqual(expected);
    });
  });

  it('InValid: 192.168.1.100:8080-8090:80-82/udp', () => {
    expect(() => {
      Port.Parse('192.168.1.100:8080-8090:80-82/udp');
    }).toThrow();
  });
});

describe('Port.ParsePorts test case', () => {
  it('0.0.0.0:1234-1235:3333-3334/tcp', () => {
    const portInfo = '0.0.0.0:1234-1235:3333-3334/tcp';
    const res = Port.ParsePorts([portInfo]);

    expect(res).toEqual({
      exposedPorts: {
        '3333/tcp': {},
        '3334/tcp': {},
      },
      portBindings: {
        '3333/tcp': [{
          HostIp: '0.0.0.0',
          HostPort: '1234',
        }],
        '3334/tcp': [{
          HostIp: '0.0.0.0',
          HostPort: '1235',
        }],
      },
    });
  });

  const tests = [
    ['1234/tcp', '2345/udp', '3456/sctp'],
    ['1234:1234/tcp', '2345:2345/udp', '3456:3456/sctp'],
    ['0.0.0.0:1234:1234/tcp', '0.0.0.0:2345:2345/udp', '0.0.0.0:3456:3456/sctp'],
  ];

  tests.forEach((value) => {
    it(JSON.stringify(value), () => {
      const { exposedPorts, portBindings } = Port.ParsePorts(value);

      value.forEach((port) => {
        const [,,containerPort] = Port.Split(port);
        expect(exposedPorts[containerPort]).toEqual({});
      });

      value.forEach((port) => {
        const [HostIp, HostPort, containerPort] = Port.Split(port);
        const item = portBindings[containerPort];

        expect(item.length).toBe(1);
        expect(item[0].HostIp).toBe(HostIp);
        expect(item[0].HostPort).toBe(HostPort);
      });
    });
  });

  it('localhost:1234:1234/tcp', () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(['localhost:1234:1234/tcp']);

    expect(exposedPorts).toEqual({ '1234/tcp': {} });
    expect(portBindings).toEqual({ '1234/tcp': [{ HostIp: 'localhost', HostPort: '1234' }] });
  });
});

describe('Port.ParsePorts with range test case', () => {
  const tests = [
    [['1234-1236/tcp', '2345-2347/udp', '3456-3458/sctp'], 3 + 3 + 3],
    [['1234-1236:1234-1236/tcp', '2345-2347:2345-2347/udp', '3456-3458:3456-3458/sctp'], 3 + 3 + 3],
  ];

  tests.forEach((item) => {
    const [value, length] = item;
    it(JSON.stringify(value), () => {
      const { exposedPorts, portBindings } = Port.ParsePorts(['1234-1236/tcp', '2345-2347/udp', '3456-3458/sctp']);

      expect(Object.keys(exposedPorts).length).toBe(length);
      expect(Object.keys(portBindings).length).toBe(length);
    });
  });
});

describe('Port.ParsePorts Parse Network Opts Private Only', () => {
  it(JSON.stringify(['192.168.1.100::80']), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(['192.168.1.100::80']);

    expect(Object.keys(exposedPorts).length).toBe(1);
    expect(Object.keys(portBindings).length).toBe(1);

    Object.entries(exposedPorts).forEach(([containerPort]) => {
      const item = portBindings[containerPort];

      expect(item.length).toBe(1);
      expect(item[0].HostIp).toBe('192.168.1.100');
      expect(item[0].HostPort).toBe('');
    });
  });
});

describe('Port.ParsePorts Parse Network Opts Public', () => {
  const value = ['192.168.1.100:8080:80'];
  it(JSON.stringify(value), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(value);

    expect(Object.keys(exposedPorts).length).toBe(1);
    expect(Object.keys(portBindings).length).toBe(1);

    Object.entries(exposedPorts).forEach(([containerPort]) => {
      const item = portBindings[containerPort];

      expect(item.length).toBe(1);
      expect(item[0].HostIp).toBe('192.168.1.100');
      expect(item[0].HostPort).toBe('8080');
    });
  });
});

describe('Port.ParsePorts Parse Network Opts Public', () => {
  const value = ['192.168.1.100'];
  it(JSON.stringify(value), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(value);

    expect(Object.keys(exposedPorts).length).toBe(0);
    expect(Object.keys(portBindings).length).toBe(0);
  });
});

describe('Port.ParsePorts Parse Network Opts Negative Ports', () => {
  const value = ['192.168.1.100:-1:-1'];
  it(JSON.stringify(value), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(value);

    expect(Object.keys(exposedPorts).length).toBe(0);
    expect(Object.keys(portBindings).length).toBe(0);
  });
});

describe('Port.ParsePorts Network Opts Udp', () => {
  const value = ['192.168.1.100::6000/udp'];
  it(JSON.stringify(value), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(value);

    expect(Object.keys(exposedPorts).length).toBe(1);
    expect(Object.keys(portBindings).length).toBe(1);

    Object.entries(exposedPorts).forEach(([containerPort]) => {
      const item = portBindings[containerPort];

      expect(containerPort).toBe('6000/udp');
      expect(item.length).toBe(1);
      expect(item[0].HostIp).toBe('192.168.1.100');
      expect(item[0].HostPort).toBe('');
    });
  });
});

describe('Port.ParsePorts Network Opts Sctp', () => {
  const value = ['192.168.1.100::6000/sctp'];
  it(JSON.stringify(value), () => {
    const { exposedPorts, portBindings } = Port.ParsePorts(value);

    expect(Object.keys(exposedPorts).length).toBe(1);
    expect(Object.keys(portBindings).length).toBe(1);

    Object.entries(exposedPorts).forEach(([containerPort]) => {
      const item = portBindings[containerPort];

      expect(containerPort).toBe('6000/sctp');
      expect(item.length).toBe(1);
      expect(item[0].HostIp).toBe('192.168.1.100');
      expect(item[0].HostPort).toBe('');
    });
  });
});
