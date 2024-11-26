import {
  pbkdf2Sync, createCipheriv, randomBytes,
  type CipherCCMTypes,
  type CipherKey,
  type BinaryLike,
} from 'crypto';

const algorithm: CipherCCMTypes = 'aes-128-ccm';
const iv: BinaryLike = randomBytes(16);

const key = pbkdf2Sync('secret', 'salt', 100000, 64, 'sha512').toString('hex');
console.log(key.toString('hex')); // '3745e48...08d59ae'

try {
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  // ...
} catch (e) {
  console.error('Error creating cipher:', e.message);
}

function encodeAes(content: string) {
  const cipher = createCipheriv(algorithm, key, iv);
  // let encStr = cipher.update(content, 'utf-8', 'base64');

  // encStr += cipher.final('base64');
  // return encStr;
}

const aes = encodeAes('sobird');
console.log('aes', aes);
