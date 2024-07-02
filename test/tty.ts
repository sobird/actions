import tty from 'tty';

// 获取标准输出的文件描述符
const stdoutFd = process.stdout.fd;

console.log('stdoutFd', stdoutFd);

// 检查标准输出是否连接到终端
const isTerminal = tty.isatty(stdoutFd);

console.log('是否连接到终端:', isTerminal);
