import { z } from 'zod';

export const LogSchema = z.object({
  level: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .describe('The level of logging, can be trace, debug, info, warn, error, fatal.'),
});

export const RegistrationSchema = z.object({
  file: z.string().optional().describe('Where to store the registration result.'),
});

export const DaemonSchema = z
  .object({
    capacity: z.number().int().positive().default(1).describe('Execute how many tasks concurrently at the same time.'),
    timeout: z
      .number()
      .int()
      .positive()
      .default(3 * 3600 * 1000)
      .describe(
        `The timeout for a job to be finished. \nPlease note that the Server instance also has a timeout (3h by default) for the job. \nSo the job could be stopped by the Server instance if it's timeout is shorter than this.`,
      ),
    fetchTimeout: z
      .number()
      .int()
      .positive()
      .default(5000)
      .describe('The timeout for fetching the job from the Server instance.'),
    fetchInterval: z
      .number()
      .int()
      .positive()
      .default(2000)
      .describe('The interval for fetching the job from the Server instance.'),
    insecure: z.boolean().default(false).describe('Whether skip verifying the TLS certificate of the Server instance.'),
  })
  .loose();

export const RunnerSchema = z.object({
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      ` https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs\n NOT RECOMMENDED! You can configure the context yourself based on the link provided above.`,
    ),
  actor: z.string().optional().describe('The username of the user that triggered the initial workflow run'),
  token: z
    .string()
    .optional()
    .describe('A token to authenticate on behalf of the GitHub App installed on your repository.'),
  eventFile: z.string().default('event.json').describe('Path to event JSON file.'),
  env: z.record(z.string(), z.string()).optional().describe('Extra environment variables to run jobs.'),
  envFile: z.string().optional().describe('Extra environment variables to run jobs from a file.'),
  vars: z.record(z.string(), z.string()).optional().describe('Extra variables to run jobs'),
  varsFile: z.string().optional().describe('Extra variables to run jobs from a file.'),
  inputs: z.record(z.string(), z.string()).optional().describe('Extra inputs to run jobs.'),
  inputsFile: z.string().optional().describe('Extra inputs to run jobs from a file.'),
  secrets: z.record(z.string(), z.string()).optional().describe('Extra secrets to run jobs.'),
  secretsFile: z.string().optional().describe('Extra secrets to run jobs from a file.'),
  workspace: z
    .string()
    .default('/home/runner')
    .describe(`The parent directory of a job's working directory.\n If it's empty, /home/runner will be used.`),
  workdir: z.string().optional().describe('Working directory.'),
  bindWorkdir: z
    .boolean()
    .default(false)
    .describe('Whether to bind mount the host working directory into the container.'),
  remoteName: z.string().optional().describe('Git remote name that will be used to retrieve url of git repo.'),
  defaultBranch: z
    .string()
    .optional()
    .describe('The default branch name to use when a job does not explicitly specify a target branch.'),
  skipCheckout: z
    .boolean()
    .optional()
    .describe(
      'If set to true, the Runner will skip the "actions/checkout" step. Useful when source code is already provided via bind mounting.',
    ),
  useGitignore: z
    .boolean()
    .optional()
    .describe('Whether to respect .gitignore rules when syncing or copying files to the execution environment.'),
  serverInstance: z
    .string()
    .optional()
    .describe('The base URL of the GitHub instance. Change this for GitHub Enterprise (GHE) deployments.'),
  actionInstance: z
    .string()
    .optional()
    .describe('The specific URL for the Actions service. Defaults to serverInstance if not provided.'),
  replaceGheActionWithGithubCom: z
    .array(z.string())
    .optional()
    .describe(
      'Automatically redirect Action requests from a local GHE instance to github.com to access the public Marketplace.',
    ),
  replaceGheActionTokenWithGithubCom: z
    .string()
    .optional()
    .describe(
      'A personal access token (PAT) used to authenticate against github.com when fetching public Actions from a GHE environment.',
    ),
  actionsCache: z.boolean().default(true).describe('Enable cache server to use actions/cache.'),
  actionsCachePath: z
    .string()
    .optional()
    .describe(
      `The directory to store the cache data. \n If it's empty, the cache data will be stored in $ACTIONS_HOME/cache.`,
    ),
  actionsCacheAddr: z
    .string()
    .optional()
    .describe(
      `The host of the cache server.\n It's not for the address to listen, but the address to connect from job containers.\n So 0.0.0.0 is a bad choice, leave it empty to detect automatically.`,
    ),
  actionsCachePort: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe(`The port of the cache server.\n 0 means to use a random available port.`),
  actionsCacheExternal: z
    .string()
    .optional()
    .describe(
      `The external cache server URL. Valid only when enable is true.\n If it's specified, runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.`,
    ),
  artifactPath: z
    .string()
    .optional()
    .describe(
      `Defines the path where the artifact server stores uploads and retrieves downloads from.\n If not specified the artifact server will not start`,
    ),
  artifactAddr: z.string().optional().describe('Defines the address where the artifact server listens'),
  artifactPort: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe('Defines the port where the artifact server listens (will only bind to localhost)'),
  cacheActions: z
    .boolean()
    .default(true)
    .describe('Enable local caching of Action source code to improve job startup speed and reduce network usage.'),
  actionsPath: z
    .string()
    .optional()
    .describe('The local directory where Actions are stored. Defaults to $ACTIONS_HOME/actions if left empty.'),
  repositories: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Map remote Action repositories to local folders (e.g., "owner/repo@v1": "/local/path"). Ideal for local Action development and debugging.',
    ),
  actionsOffline: z
    .boolean()
    .optional()
    .describe(
      'When enabled, the Runner will only use Actions already present in actionsPath and will not attempt to fetch or update them from the network.',
    ),
  labels: z
    .array(z.string())
    .optional()
    .describe(
      'The labels of a runner are used to determine which jobs the runner can run, and how to run them.\n Like: "macos-arm64=host" or "ubuntu-latest=gitea/runner-images:ubuntu-latest"\n Find more images provided by Server at https://gitea.com/gitea/runner-images .\n If it\'s empty when registering, it will ask for inputting labels.\n If it\'s empty when execute `daemon`, will use labels in `.runner` file.',
    ),
  matrix: z.record(z.string(), z.array(z.unknown())).optional(),
  pull: z.boolean().default(false).describe('Pull docker image(s) even if already present'),
  reuse: z
    .boolean()
    .default(false)
    .describe("Don't remove container(s) on successfully completed workflow(s) to maintain state between runs"),
  rebuild: z.boolean().default(true).describe('Rebuild docker image(s) even if already present'),
  containerNamePrefix: z
    .string()
    .optional()
    .describe(
      'A prefix string added to the beginning of all container names for easier identification and filtering on the host machine.',
    ),
  containerNetwork: z
    .string()
    .optional()
    .describe(
      `Specifies the network to which the container will connect.\n Could be host, bridge or the name of a custom network.\n If it's empty, runner will create a network automatically.`,
    ),
  containerPlatform: z
    .string()
    .optional()
    .describe(
      `Platform which should be used to run containers, e.g.: linux/amd64. if not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.`,
    ),
  containerDaemonSocket: z.string().optional(),
  containerPrivileged: z
    .boolean()
    .default(false)
    .describe(
      'Whether to use privileged mode or not when launching task containers (privileged mode is required for Docker-in-Docker).',
    ),
  containerAutoRemove: z
    .boolean()
    .default(true)
    .describe(
      'If true, automatically removes the container and its associated resources as soon as the job execution finishes.',
    ),
  containerUsernsMode: z
    .string()
    .optional()
    .describe(
      'Sets the user namespace mode for the container. Enabling this isolates the container root user from the host root user.',
    ),
  containerCapAdd: z
    .array(z.string())
    .optional()
    .describe('Kernel capabilities to add to the workflow containers (e.g. SYS_ADMIN).'),
  containerCapDrop: z
    .array(z.string())
    .optional()
    .describe('Kernel capabilities to drop from the workflow containers (e.g. SYS_ADMIN).'),
  containerMaxLifetime: z
    .number()
    .int()
    .positive()
    .default(3600)
    .describe(
      'The maximum lifespan (in seconds) of a container. Once this limit is reached, the Runner will forcibly terminate the container to prevent resource leakage.',
    ),
  containerOptions: z
    .string()
    .optional()
    .describe(
      'And other options to be used when the container is started (eg, --add-host=my.sobird.url:host-gateway).',
    ),
});

export const ConfigSchema = z
  .object({
    log: LogSchema.optional(),
    daemon: DaemonSchema.optional(),
    runner: RunnerSchema.optional(),
    registration: RegistrationSchema.optional(),
  })
  .meta({
    description: `Configuration file, it's safe to copy this as the default config file without any modification.`,
  });

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigInput = z.input<typeof ConfigSchema>;
