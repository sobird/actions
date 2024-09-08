import os from 'os';

import { parse } from 'shell-quote';

let cmd = ['path\\to\\your\\command', 'arg1', 'arg2']; // 示例命令数组

if (os.platform() === 'win32') {
  const newCmd = cmd.map((v) => { return v.replace(/\\/g, '/'); });
  cmd = newCmd;
}

console.log('cmd', cmd);

const xs = parse('id -u "\\root"');
console.dir(xs);

const xs2 = parse('a "b c" \\$def \'it\\\'s great\'');

console.log('xs2', xs2);
