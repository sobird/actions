import crypto from 'node:crypto';

import secret from './secret';

describe('Secret Encrypt & Decrypt', () => {
  it('normal encrypt & decrypt', () => {
    const hex = secret.encrypt('foo', 'baz');
    const val = secret.decrypt('foo', hex);

    expect(val).toBe('baz');
  });

  it('hex string too short', () => {
    expect(() => {
      secret.decrypt('foo', 'invalid hex string');
    }).toThrow('ciphertext too short');
  });

  it('decrypt invalid hex string', () => {
    expect(() => {
      secret.decrypt('foo', `${crypto.randomBytes(16).toString('hex')}invalid`);
    }).toThrowError('Received undefined');
  });
});
