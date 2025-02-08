import ArtifactCache from '.';

const artifactCache = new ArtifactCache();
console.log('Artifact Cache Server Address:', await artifactCache.serve(3000));
