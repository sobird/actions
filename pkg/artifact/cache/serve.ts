import ArtifactCacheServer from '.';

const cache = new ArtifactCacheServer(undefined, undefined, 3000);
console.log('Server address:', await cache.serve());
