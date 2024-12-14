import simpleGit from 'simple-git';

const git = simpleGit('.');

const commit = await git.revparse('master');
console.log('commit', commit, await git.firstCommit());

const files = await git.raw(['ls-tree', '-r', '--name-only', '055ce401ebead09543835e9c79b0f8f1ccbbdbd2']);
console.log('files', files);
