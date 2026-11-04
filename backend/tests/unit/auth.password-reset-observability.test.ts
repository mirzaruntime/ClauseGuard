import { requestPasswordReset } from '../../src/services/auth.service';
import { User } from '../../src/models/User';
import { env } from '../../src/config/env';
import { logger } from '../../src/utils/logger';
import { sendPasswordResetEmail } from '../../src/services/email.service';

jest.mock('../../src/models/User', () => ({ User: { findOne: jest.fn(), updateOne: jest.fn() } }));
jest.mock('../../src/config/env', () => ({
  env: { FRONTEND_URL: 'https://app.example.com', isDevelopment: false },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/services/email.service', () => ({ sendPasswordResetEmail: jest.fn() }));

const findOneMock = jest.mocked(User.findOne);
const updateOneMock = jest.mocked(User.updateOne);
const sendEmailMock = jest.mocked(sendPasswordResetEmail);
const loggerMock = jest.mocked(logger);

describe('password reset delivery observability', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    updateOneMock.mockReset().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 } as never);
    sendEmailMock.mockReset();
    loggerMock.warn.mockClear();
    loggerMock.info.mockClear();
    env.FRONTEND_URL = 'https://app.example.com';
    env.isDevelopment = false;
  });

  it('logs a safe reason when the account does not exist', async () => {
    findOneMock.mockResolvedValue(null);

    await requestPasswordReset({ email: 'person@example.com' });

    expect(loggerMock.info).toHaveBeenCalledWith('auth.password_reset.email_skipped', {
      reasonCode: 'USER_NOT_FOUND',
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(JSON.stringify(loggerMock.info.mock.calls)).not.toContain('person@example.com');
  });

  it('logs a safe reason and clears the token when the frontend URL is missing', async () => {
    findOneMock.mockResolvedValue({ _id: 'user-id' } as never);
    env.FRONTEND_URL = undefined;

    await requestPasswordReset({ email: 'person@example.com' });

    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_skipped', {
      reasonCode: 'FRONTEND_URL_MISSING',
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(updateOneMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('person@example.com');
  });

  it('records delivery failure while preserving the cleanup path', async () => {
    findOneMock.mockResolvedValue({ _id: 'user-id', email: 'person@example.com' } as never);
    sendEmailMock.mockResolvedValue(false);

    await requestPasswordReset({ email: 'person@example.com' });

    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_skipped', {
      reasonCode: 'EMAIL_DELIVERY_FAILED',
    });
    expect(updateOneMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('person@example.com');
  });
});
