import jwt from 'jsonwebtoken';
import { extractBearerToken, signAccessToken, verifyAccessToken } from '../../src/utils/jwt';
import { ApiError } from '../../src/utils/ApiError';

const USER_ID = '507f1f77bcf86cd799439011';

describe('jwt utilities', () => {
  it('round-trips a signed token', () => {
    const token = signAccessToken({ sub: USER_ID, email: 'user@example.com' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.email).toBe('user@example.com');
    expect(payload.tokenVersion).toBe(0);
  });

  it('treats legacy JWTs without a token version as version zero', () => {
    const legacy = jwt.sign({ email: 'user@example.com' }, process.env.JWT_SECRET as string, {
      subject: USER_ID,
      issuer: 'clauseguard',
      expiresIn: '1h',
    });

    expect(verifyAccessToken(legacy).tokenVersion).toBe(0);
  });

  it('round-trips an explicit token version', () => {
    const token = signAccessToken({ sub: USER_ID, email: 'user@example.com', tokenVersion: 4 });
    expect(verifyAccessToken(token).tokenVersion).toBe(4);
  });

  it('rejects a malformed token', () => {
    expect(() => verifyAccessToken('not.a.token')).toThrow(ApiError);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ email: 'a@b.c' }, 'a-completely-different-secret-value-here', {
      subject: USER_ID,
      issuer: 'clauseguard',
    });
    expect(() => verifyAccessToken(forged)).toThrow(/Invalid authentication token/);
  });

  it('rejects a token from a different issuer', () => {
    const forged = jwt.sign({ email: 'a@b.c' }, process.env.JWT_SECRET as string, {
      subject: USER_ID,
      issuer: 'someone-else',
    });
    expect(() => verifyAccessToken(forged)).toThrow(ApiError);
  });

  it('reports an expired token distinctly', () => {
    const expired = jwt.sign({ email: 'a@b.c' }, process.env.JWT_SECRET as string, {
      subject: USER_ID,
      issuer: 'clauseguard',
      expiresIn: '-1s',
    });
    try {
      verifyAccessToken(expired);
      throw new Error('expected verification to fail');
    } catch (error) {
      expect((error as ApiError).code).toBe('TOKEN_EXPIRED');
    }
  });

  it('parses only well-formed Authorization headers', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer abc')).toBe('abc');
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
