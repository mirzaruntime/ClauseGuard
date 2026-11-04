import { User, type SafeUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { hashPassword, verifyPassword } from '../utils/password';
import { logger } from '../utils/logger';
import type { ChangePasswordInput, UpdateProfileInput } from '../validators/user.validator';

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  if (input.name !== undefined) user.name = input.name;
  await user.save();

  return user.toSafeJSON();
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();

  logger.info('user.password_changed', { userId });
}
