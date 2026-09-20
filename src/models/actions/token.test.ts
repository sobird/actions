import { generateTokenSalt, hashToken, verifyToken } from './token';

describe('token primitives', () => {
  it('generates a fresh salt on every call', () => {
    const salt = generateTokenSalt();

    expect(salt).not.toBe(generateTokenSalt());
    expect(salt).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it('hashes a token into a stable hex digest of the documented length', () => {
    const hash = hashToken('token', 'salt');

    expect(hash).toMatch(/^[0-9a-f]{100}$/);
    expect(hash).toBe(hashToken('token', 'salt'));
  });

  it('hashes the same token differently under a different salt', () => {
    expect(hashToken('token', 'salt')).not.toBe(hashToken('token', 'other-salt'));
  });

  it('verifies a token against its own salt and hash', () => {
    const salt = generateTokenSalt();

    expect(verifyToken('token', salt, hashToken('token', salt))).toBe(true);
  });

  it('rejects a token that does not match the hash', () => {
    const salt = generateTokenSalt();

    expect(verifyToken('other-token', salt, hashToken('token', salt))).toBe(false);
  });

  it('rejects a hash produced under another salt', () => {
    expect(verifyToken('token', generateTokenSalt(), hashToken('token', 'salt'))).toBe(false);
  });

  it('rejects missing or malformed input instead of throwing', () => {
    const salt = generateTokenSalt();

    expect(verifyToken('', salt, hashToken('', salt))).toBe(false);
    expect(verifyToken('token', '', hashToken('token', ''))).toBe(false);
    expect(verifyToken('token', salt, '')).toBe(false);
    expect(verifyToken('token', salt, '0123456789')).toBe(false);
  });
});
