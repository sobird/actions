/**
 * docker container create
 * options
 * @see https://docs.docker.com/reference/cli/docker/container/create/#options
 */

import { Command } from '@commander-js/extra-typings';
import {
  ContainerCreateOptions, EndpointsConfig, EndpointSettings, MountConfig, MountSettings,
} from 'dockerode';
import { merge } from 'lodash-es';
import shellQuote from 'shell-quote';

import Port from '../workflow/job/container/port';

export default class Options {
  constructor(public options: string = '') {}

  parse() {
    const program = new Command()
      .description('docker container create options')
    // .storeOptionsAsProperties(false)
      .option('--name <name>', 'Assign a name to the container')
      .option('--image <image>', 'Container image')
      .option('--platform <platform>', 'API 1.32+ Set platform if server is multi-platform capable')
      .option('--cpus <number>', 'API 1.25+ Number of CPUs', (value: string) => { return Number(value); })
      .option('--memory <size>', 'Memory limit(e.g. 512m)')
      .option('--memory-swap <size>', "Swap limit equal to memory plus swap: '-1' to enable unlimited swap")
      .option('-v, --volume <path...>', 'Bind mount a volume(e.g. /host/path:/container/path)')
      .option('-p --publish <port...>', 'Publish a container\'s port(s) to the host(e.g. 8080:80)')
      .option('--env <env...>', 'Set environment variables(e.g. MY_ENV=value)')
      .option('--restart <policy>', 'Restart policy to apply when a container exits(e.g. always)')
      .option('--network <network>', 'Connect a container to a network(e.g. bridge)')
      .option('--network-alias <network-alias...>', 'Add network-scoped alias for the container')
      .option('--entrypoint <entrypoint...>', 'Overwrite the default ENTRYPOINT of the image')
      .option('--cmd <cmd...>', 'Command executed after container startup')
      .option('-w, --workdir <workdir>', 'Working directory inside the container')
      .option('-u, --user <user>', 'Username or UID (format: <name|uid>[:<group|gid>])')
      .option('--userns <userns>', 'User namespace to use')
      .option('-l, --label <label>', 'Set meta data on a container(e.g. key=value)')
      .option('-h, --hostname <hostname>', 'Container host name')
      .option('--domainname <domainname>', 'Container NIS domain name')
      .option('--dns <dns>', 'Set custom DNS servers')
      .option('--dns-search <dns-search>', 'Set custom DNS search domains')
      .option('--add-host <host>', 'Add a custom host-to-IP mapping (host:ip)')
      .option('--cap-add <cap...>', 'Add Linux capabilities (e.g. SYS_ADMIN)')
      .option('--cap-drop <cap...>', 'Drop Linux capabilities (e.g. SYS_ADMIN)')
      .option('--security-opt <opt>', 'Security Options (e.g. seccomp=unconfined)')
      .option('--ulimit <ulimit>', 'Ulimit options (e.g. nofile=1024:2048)')
      .option('--device <device>', 'Add a host device to the container (e.g. /dev/sda:/dev/xvda)')
      .option('--tmpfs <tmpfs>', 'Mount a tmpfs directory (e.g. /run:rw,noexec,nosuid)')
      .option('--log-driver <driver>', 'Logging driver for the container (e.g. json-file)')
      .option('--log-opt <opt>', 'Log driver options (e.g. max-size=10m)')
      .option('--health-cmd <cmd>', 'Command to run to check health (e.g. curl -f http://localhost/)')
      .option('--health-interval <interval>', 'Time between running the check (ms|s|m|h) (default 0s) (e.g. 5s)')
      .option('--health-retries <retries>', 'Consecutive failures needed to report unhealthy')
      .option('--health-timeout <timeout>', 'Maximum time to allow one check to run (ms|s|m|h) (default 0s) (e.g. 3s)')
      .option('--health-start-period <period>', 'API 1.29+ Start period for the container to initialize before starting health-retries countdown (ms|s|m|h) (default 0s) (e.g. 10s)')
      .option('--stop-signal <signal>', 'Signal to stop the container (e.g. SIGTERM)')
      .option('--stop-timeout <timeout>', 'API 1.25+ Timeout (in seconds) to stop a container')
      .option('--sysctl <sysctl>', 'Sysctl options (e.g. net.core.somaxconn=1024)')
      .option('--shm-size <size>', 'Size of /dev/shm (e.g. 64m)')
      .option('--group-add <group>', 'Add additional groups to join (e.g. 1000)')
      .option('--read-only', 'Mount the container\'s root filesystem as read only')
      .option('--ipc <ipc>', 'IPC mode to use (e.g. host)')
      .option('--pid <pid>', 'PID namespace to use (e.g. host)')
      .option('--uts <uts>', 'UTS namespace to use (e.g. host)')
      .option('-t --tty', 'Allocate a pseudo-TTY', false)
      .option('--rm', 'Automatically remove the container and its associated anonymous volumes when it exits', false)
      .option('--cgroup-parent <parent>', 'Optional parent cgroup for the container')
      .option('--device-read-bps <bps>', 'Limit read rate (bytes per second) from a device (e.g. /dev/sda:1mb)')
      .option('--device-write-bps <bps>', 'Limit write rate (bytes per second) to a device (e.g. /dev/sda:1mb)')
      .option('--device-read-iops <iops>', 'Limit read rate (IO per second) from a device (e.g. /dev/sda:1000)')
      .option('--device-write-iops <iops>', 'Limit write rate (IO per second) to a device(e.g. /dev/sda:1000)')
      .option('--oom-kill-disable', 'Disable OOM Killer')
      .option('--oom-score-adj <score>', "Tune host's OOM preferences (-1000 to 1000)")
      .option('--privileged', 'Give extended privileges to this container', false)
      .option('--pids-limit <limit>', 'Tune container pids limit (set -1 for unlimited)')
      .option('--cpuset-cpus <cpus>', 'CPUs in which to allow execution (0-3, 0,1)')
      .option('--cpuset-mems <mems>', 'MEMs in which to allow execution (0-3, 0,1)')
      .option('--isolation <isolation>', 'Container isolation technology (e.g. hyperv 或 process)')
      .option('--mount <mount...>', 'Attach a filesystem mount to the container (e.g., type=bind,source=/host/path,target=/container/path,readonly)', (value: string, previous: MountConfig = []) => {
        return previous.concat(Options.Mount(value));
      });

    const args = shellQuote.parse(this.options) as string[];
    program.parse(args, { from: 'user' });
    return program.opts();
  }

  dockerodeOptions(opts: ReturnType<this['parse']>) {
    const options = merge({}, this.parse(), opts);

    const { exposedPorts, portBindings } = Port.ParsePorts(options.publish);

    const containerCreateOptions = {
      name: options.name,
      Image: options.image,
      Env: options.env,
      Entrypoint: options.entrypoint,
      WorkingDir: options.workdir,
      User: options.user,
      Labels: options.label,
      Hostname: options.hostname,
      Domainname: options.domainname,
      StopSignal: options.stopSignal,
      StopTimeout: options.stopTimeout,
      Healthcheck: options.healthCmd ? {
        Test: options.healthCmd,
        Interval: options.healthInterval,
        Retries: options.healthRetries,
        Timeout: options.healthTimeout,
        StartPeriod: options.healthStartPeriod,
      } : undefined,
      ExposedPorts: exposedPorts,
      HostConfig: {
        Mounts: options.mount,
        NanoCPUs: options.cpus ? options.cpus * 1e9 : undefined,
        Memory: Options.Memory(options.memory),
        MemorySwap: Options.Memory(options.memorySwap),
        Binds: options.volume,
        PortBindings: portBindings,
        RestartPolicy: options.restart ? { Name: options.restart } : undefined,
        NetworkMode: options.network,
        Dns: options.dns,
        DnsSearch: options.dnsSearch,
        ExtraHosts: options.addHost,
        CapAdd: options.capAdd,
        CapDrop: options.capDrop,
        SecurityOpt: options.securityOpt,
        Ulimits: options.ulimit,
        Devices: options.device,
        Tmpfs: options.tmpfs,
        LogConfig: {
          Type: options.logDriver,
          Config: options.logOpt,
        },
        Sysctls: options.sysctl,
        ShmSize: options.shmSize,
        GroupAdd: options.groupAdd,
        ReadonlyRootfs: options.readOnly,
        IpcMode: options.ipc,
        PidMode: options.pid,
        UTSMode: options.uts,
        CgroupParent: options.cgroupParent,
        BlkioDeviceReadBps: options.deviceReadBps,
        BlkioDeviceWriteBps: options.deviceWriteBps,
        BlkioDeviceReadIOps: options.deviceReadIops,
        BlkioDeviceWriteIOps: options.deviceWriteIops,
        OomKillDisable: options.oomKillDisable,
        OomScoreAdj: options.oomScoreAdj,
        Privileged: options.privileged,
        PidsLimit: options.pidsLimit,
        CpusetCpus: options.cpusetCpus,
        CpusetMems: options.cpusetMems,
        Isolation: options.isolation,
      },
    } as ContainerCreateOptions;

    const NetworkMode = options.network || 'default';
    const isNetworkMode = ['default', 'host', 'bridge', 'container', 'none'].includes(NetworkMode);
    let endpointsConfig: EndpointsConfig = {};
    if (!isNetworkMode && options.network !== 'host' && (options.networkAlias || []).length > 0) {
      const endpointSettings: EndpointSettings = {
        Aliases: options.networkAlias,
      };

      endpointsConfig = {
        [NetworkMode]: endpointSettings,
      };
    }

    containerCreateOptions.NetworkingConfig = {
      EndpointsConfig: endpointsConfig,
    };

    return JSON.parse(JSON.stringify(containerCreateOptions)) as ContainerCreateOptions;
  }

  toString() {
    return this.options;
  }

  static Memory(memory?: string) {
    if (!memory) {
      return;
    }
    const unit = memory.slice(-1);
    const value = parseFloat(memory);
    switch (unit) {
      case 'g':
        return value * 1024 * 1024 * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'k':
        return value * 1024;
      default:
        return value; // 默认单位为字节
    }
  }

  static Mount(mounts: string = ''): MountSettings {
    // return mounts.map((item: string) => {
    const mount: Partial<MountSettings> = {};

    mounts.split(',').forEach((part) => {
      const [key, value] = part.split('=');
      const Key = key.charAt(0).toUpperCase() + key.slice(1) as keyof MountSettings;

      switch (Key) {
        case 'Type':
          if (value === 'bind' || value === 'volume' || value === 'tmpfs') {
            mount.Type = value;
          } else {
            throw new Error(`Invalid mount type: ${value}`);
          }
          break;
        case 'ReadOnly':
          mount.ReadOnly = true;
          break;
        case 'Source':
        case 'Target':
          mount[Key] = value;
          break;
        default:
          console.warn(`Unknown mount key: ${Key}`);
      }
    });

    if (!mount.Type || !mount.Target) {
      throw new Error('Missing required mount fields: Type and Target');
    }

    return mount as MountSettings;
    // });
  }
}
