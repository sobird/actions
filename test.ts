import {
  pbkdf2Sync, createCipheriv, randomBytes,
  type CipherCCMTypes,
  type CipherKey,
  type BinaryLike,
} from 'crypto';

const algorithm: CipherCCMTypes = 'aes-128-ccm';
const iv: BinaryLike = randomBytes(16);

const key: CipherKey = pbkdf2Sync('secret', 'salt', 100000, 64, 'sha1');
console.log('key', key);
// console.log(key.toString('hex')); // '3745e48...08d59ae'

const nonce = randomBytes(12);

try {
  const cipher = createCipheriv('aes-256-cbc', key.toString(), nonce, {
    authTagLength: 16,
  });
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
