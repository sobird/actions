import ArtifactCache from '.';

const artifactCache = await ArtifactCache.create();
console.log('Artifact Cache Server Address:', await artifactCache.serve(3000));
