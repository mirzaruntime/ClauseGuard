import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createReminderSchema,
  listRemindersSchema,
  reminderIdSchema,
  updateReminderSchema,
} from '../validators/reminder.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createReminderSchema), reminderController.create);
router.get('/', validate(listRemindersSchema), reminderController.list);
router.get('/:id', validate(reminderIdSchema), reminderController.getById);
router.patch('/:id', validate(updateReminderSchema), reminderController.update);
router.delete('/:id', validate(reminderIdSchema), reminderController.remove);

export default router;
