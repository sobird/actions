import os from 'os';
import fs from 'fs';
import path from 'path';
import log4js, { Logger } from 'log4js';
import ip from 'ip';

class ArtifactCacheServer {
  constructor(
    public dir: string = path.join(os.homedir(), '.cache', 'actcache'),
    public outboundIP: string = ip.address(),
    public port: number = 0,
    public logger: Logger = log4js.getLogger(),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export default ArtifactCacheServer;
