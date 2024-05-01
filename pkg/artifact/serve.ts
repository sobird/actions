import Artifact from '.';

const artifact = new Artifact(undefined, undefined, 3000);
console.log('Artifact Server address:', await artifact.serve());
