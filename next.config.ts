import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 这些包必须留在打包之外：ssh2 静态 require 了一个 .node 原生扩展，
  // dockerode 在运行期按 __dirname 去读 lib/proto 下的 .proto 文件。
  serverExternalPackages: ['sequelize', 'ssh2', 'dockerode'],
  /* config options here */
};

export default nextConfig;
