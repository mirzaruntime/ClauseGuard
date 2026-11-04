import { deliverNotification, isChannelAvailable } from '../../src/services/notification.service';
import { User } from '../../src/models/User';
import { Contract } from '../../src/models/Contract';
import { sendReminderEmail } from '../../src/services/email.service';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/models/User', () => ({ User: { findById: jest.fn() } }));
jest.mock('../../src/models/Contract', () => ({ Contract: { findOne: jest.fn() } }));
jest.mock('../../src/services/email.service', () => ({ sendReminderEmail: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const payload = {
  ownerId: 'owner-id', reminderId: 'reminder-id', obligationId: 'obligation-id',
  contractId: 'contract-id', obligationTitle: 'Renewal notice', deadline: null,
  message: 'Send notice', reminderDate: new Date('2027-01-01T00:00:00.000Z'),
};

describe('notification service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers email and retains the existing log channel', async () => {
    expect(isChannelAvailable('email')).toBe(true);
    expect(isChannelAvailable('log')).toBe(true);
    await deliverNotification('log', payload);
    expect(logger.info).toHaveBeenCalledWith('reminder.delivered', {
      channel: 'log',
      reminderId: payload.reminderId,
      obligationId: payload.obligationId,
      ownerId: payload.ownerId,
      deadline: null,
    });
    const context = jest.mocked(logger.info).mock.calls[0]?.[1];
    expect(context).not.toHaveProperty('obligationTitle');
    expect(context).not.toHaveProperty('message');
    expect(JSON.stringify(context)).not.toContain(payload.obligationTitle);
    expect(JSON.stringify(context)).not.toContain(payload.message);
  });

  it('uses the owner email and owner-scoped contract data for delivery', async () => {
    jest.mocked(User.findById).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ email: 'owner@example.com' }) }) } as never);
    jest.mocked(Contract.findOne).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'contract-id', title: 'Services Agreement' }) }) } as never);

    await deliverNotification('email', payload);

    expect(User.findById).toHaveBeenCalledWith('owner-id');
    expect(Contract.findOne).toHaveBeenCalledWith({ _id: 'contract-id', ownerId: 'owner-id' });
    expect(sendReminderEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com', contractTitle: 'Services Agreement',
      reminderUrl: expect.stringContaining('/contracts/contract-id'),
    }));
  });

  it('rejects missing recipient data without calling Resend', async () => {
    jest.mocked(User.findById).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) } as never);
    jest.mocked(Contract.findOne).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) } as never);
    await expect(deliverNotification('email', payload)).rejects.toThrow('no valid email address');
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });
});
