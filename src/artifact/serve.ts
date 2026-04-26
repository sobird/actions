import Artifact from '.';

const artifact = new Artifact();
console.log('Artifact Server Address:', await artifact.serve(4000));
