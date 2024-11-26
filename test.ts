import { pbkdf2Sync } from 'crypto';

const key = pbkdf2Sync('secret', Buffer.from('salt'), 100000, 64, 'sha512');
console.log('key', key);
console.log(key.toString('hex')); // '3745e48...08d59ae'
console.log(key.toString());
