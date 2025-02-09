import { spawnSync } from 'node:child_process';

const child = spawnSync('node', ['/Users/sobird/.actions/actions/6b28bcb67123c6f2/home/runner/work/actions/actions/cache/v4/dist/save/index.js'], {
  shell: true,
  env: {
    ...process.env,

    PATH: '/Users/sobird/Library/pnpm:/usr/local/opt/mysql-client/bin:/usr/local/lib/ruby/gems/3.1.0/bin:/usr/local/opt/ruby/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/share/dotnet:~/.dotnet/tools',

    ACTIONS_CACHE_URL: 'http://192.168.50.100:3000/',
    ACTIONS_SKIP_CHECKOUT: 'true',

    GITHUB_REF: 'refs/heads/master',

    GITHUB_WORKSPACE: '/Users/sobird/.actions/actions/c88dd2466a5b7752/Users/sobird/act-runner',
    RUNNER_TEMP: '/Users/sobird/.actions/actions/c88dd2466a5b7752/home/runner/work/temp',

    INPUT_PATH: 'test\n',
    INPUT_KEY: 'macOS-dependencies-',
    'INPUT_RESTORE-KEYS': 'macOS-dependencies-\n',
    'INPUT_UPLOAD-CHUNK-SIZE': '',
    INPUT_ENABLECROSSOSARCHIVE: '',
    'INPUT_FAIL-ON-CACHE-MISS': '',
    'INPUT_LOOKUP-ONLY': '',
    'INPUT_SAVE-ALWAYS': '',
    STATE_CACHE_KEY: 'macOS-dependencies-',
  },
  cwd: '/Users/sobird/.actions/actions/c88dd2466a5b7752/Users/sobird/act-runner/',
  stdio: 'pipe',
});

console.log('stdout', child.stdout.toString());
console.log('child', child.stderr.toString());
