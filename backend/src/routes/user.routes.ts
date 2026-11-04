import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { changePasswordSchema, updateProfileSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate);

router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.post('/me/password', validate(changePasswordSchema), userController.changePassword);

export default router;
