import simpleGit from 'simple-git';

const git = simpleGit({ baseDir: './test' });

const commit = await git.revparse(['HEAD']);
console.log('commit', commit);
// await git.clone('http://192.168.50.100:3000/sobird/actions-test.git', './dd');

// const result = await git.raw(['archive', '--output', './dd/latest.zip', commit]);
const archive = await git.raw(['archive', '--output', './dd/latest.zip', commit, '--prefix=repo2/']);

console.log('archive', archive);
