import ArtifactCache from '.';

const artifactCache = new ArtifactCache(undefined, undefined, 3000);
console.log('ArtifactCache Server address:', await artifactCache.serve());
