import crypto from 'node:crypto';

const algorithm = 'aes-256-cfb';
const separate = ':';

/** encrypts a string and given key with AES into a hex string */
export function encrypt(key: string, value: string) {
  const kh = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, kh, iv);
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return `${iv.toString('hex')}:${encrypted}`;
}

/** decrypts a previously encrypted hex string and given key with AES. */
export function decrypt(key: string, hex: string) {
  if (hex.length < 32) {
    throw Error('ciphertext too short');
  }
  const kh = crypto.createHash('sha256').update(key).digest();
  const [iv, value] = hex.split(separate);

  const decipher = crypto.createDecipheriv(algorithm, kh, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(value, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export default {
  encrypt,
  decrypt,
};
