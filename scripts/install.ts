import { sequelize } from '@/models';

// sync() only returns the instance on the acyclic path. Models with foreign keys
// pointing at each other (a run and its latest attempt) go through the sqlite
// cyclic branch, which resolves to undefined, so the models are read off the
// instance rather than the return value.
await sequelize.sync({ force: true });
console.log('install models:', Object.keys(sequelize.models));
