import { sequelize } from '@/models';

const res = await sequelize.sync({ force: true });
console.log('install models:', res.models);

// WAL is persistent in the database file, so a fresh database only needs this
// once. It cannot be done from the app's startup path: the switch needs an
// exclusive lock, and it fails while another process holds the database.
await sequelize.query('PRAGMA journal_mode = WAL');
console.log('journal_mode:', await sequelize.query('PRAGMA journal_mode'));
