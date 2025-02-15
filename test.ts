import { createFnv1aHash } from './utils';

function artifactNameToID(name) {
  const fnvOffset32 = 2166136261;
  const fnvPrime32 = 16777619;

  let hash = fnvOffset32;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash *= fnvPrime32;
  }
  return hash >>> 0; // 确保结果为无符号 32 位整数
}

const artifactName = 'test-artifact';
const artifactID = artifactNameToID(artifactName);
console.log(`Artifact Name: ${artifactName}, Monolith Database ID: ${artifactID}`);
console.log('createFnv1aHash', createFnv1aHash('test-artifact'));
