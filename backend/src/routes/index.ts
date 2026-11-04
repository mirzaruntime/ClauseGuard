import { Router } from 'express';
import { health, readiness } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import contractRoutes from './contract.routes';
import obligationRoutes from './obligation.routes';
import reminderRoutes from './reminder.routes';

const router = Router();

router.get('/health', health);
router.get('/health/ready', readiness);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contracts', contractRoutes);
router.use('/obligations', obligationRoutes);
router.use('/reminders', reminderRoutes);

export default router;
