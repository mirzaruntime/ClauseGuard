import { Router } from 'express';
import * as obligationController from '../controllers/obligation.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listObligationsSchema,
  obligationIdSchema,
  updateObligationSchema,
} from '../validators/obligation.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listObligationsSchema), obligationController.list);
router.get('/stats', obligationController.stats);
router.get('/:id', validate(obligationIdSchema), obligationController.getById);
router.patch('/:id', validate(updateObligationSchema), obligationController.update);
router.delete('/:id', validate(obligationIdSchema), obligationController.remove);

export default router;
