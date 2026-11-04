import { Router } from 'express';
import * as contractController from '../controllers/contract.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadContractFile } from '../middleware/upload';
import { uploadRateLimiter } from '../middleware/rateLimit';
import {
  contractIdSchema,
  listContractsSchema,
  uploadContractSchema,
} from '../validators/contract.validator';

const router = Router();

// Every contract route requires authentication and is scoped to the owner.
router.use(authenticate);

router.post(
  '/upload',
  uploadRateLimiter,
  uploadContractFile,
  validate(uploadContractSchema),
  contractController.upload,
);
router.get('/', validate(listContractsSchema), contractController.list);
router.get('/:id', validate(contractIdSchema), contractController.getById);
router.delete('/:id', validate(contractIdSchema), contractController.remove);

export default router;
