import os from 'node:os';
import path from 'node:path';

class Cache {
  /**
   * Enable cache server to use actions/cache.
   */
  public enabled: boolean;

  /**
   * The directory to store the cache data.
   * If it's empty, the cache data will be stored in $HOME/.cache/actcache.
   */
  public dir: string;

  /**
   * The host of the cache server.
   * It's not for the address to listen, but the address to connect from job containers.
   * So 0.0.0.0 is a bad choice, leave it empty to detect automatically.
   */
  public host: string;

  /**
   * The port of the cache server.
   * 0 means to use a random available port.
   */
  public port: number;

  /**
   * The external cache server URL. Valid only when enable is true.
   * If it's specified, runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.
   * The URL should generally end with "/".
   */
  public externalServer: string;

  constructor(cache: Cache) {
    this.enabled = cache.enabled ?? true;
    this.dir = cache.dir ?? path.join(os.homedir(), '.actions', 'cache');
    this.host = cache.host ?? '';
    this.port = cache.port ?? 0;
    this.externalServer = cache.externalServer ?? '';
  }
}

export default Cache;
