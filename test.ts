import Action from './pkg/runner/action';

const action = Action.Read('.github/workflows/ci.yml');
console.log('action', action);
