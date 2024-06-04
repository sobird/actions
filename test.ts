import GitUrlParse from 'git-url-parse';

const url = GitUrlParse('git@github.com:sobird/actions-test/.github/workflows/filename@ref');
console.log('url', url);
