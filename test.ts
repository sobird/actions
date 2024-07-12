import Port from './pkg/workflow/job/container/port';

const value = ['192.168.1.100: : '];
const { exposedPorts, portBindings } = Port.ParsePorts(value);
console.log('exposedPorts', exposedPorts);
console.log('portBindings', portBindings);
