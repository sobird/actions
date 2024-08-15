import Artifact from '.';

const artifact = new Artifact(undefined, undefined, 4000);
console.log('Artifact Server address:', await artifact.serve());
