import crypto from 'node:crypto';

console.log('crypto', crypto.randomBytes(8).toString('hex'));
console.log('crypto', crypto.randomUUID());
