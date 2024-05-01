import ArtifactsCacheServer from '.';

const cache = new ArtifactsCacheServer(undefined, undefined, 3000);
console.log('Server address:', await cache.serve());
