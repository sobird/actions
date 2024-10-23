import path from 'node:path';

console.log('first', path.resolve('sobird/test'));

type Route = {
  path: string;
  children?: Routes;
};
type Routes = Record<string, Route>;

const routes = {
  AUTH: {
    path: '/auth',
  },
} satisfies Routes;

console.log('routes', routes.NONSENSE.path);
