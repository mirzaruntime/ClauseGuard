import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password utilities', () => {
  it('never returns the plaintext password', async () => {
    const hash = await hashPassword('CorrectHorse123');
    expect(hash).not.toContain('CorrectHorse123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies a matching password', async () => {
    const hash = await hashPassword('CorrectHorse123');
    await expect(verifyPassword('CorrectHorse123', hash)).resolves.toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('CorrectHorse123');
    await expect(verifyPassword('WrongHorse123', hash)).resolves.toBe(false);
  });

  it('rejects verification against an empty hash', async () => {
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
  });

  it('produces a different hash for the same password (unique salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('SamePass123'), hashPassword('SamePass123')]);
    expect(a).not.toEqual(b);
  });
});
