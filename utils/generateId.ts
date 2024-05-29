import crypto from 'crypto';

export function generateId(string: string) {
  const hash = crypto.createHash('sha256').update(string);
  return parseInt(hash.digest('hex').substring(0, 6), 16);
}
