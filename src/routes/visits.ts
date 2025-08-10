import express from 'express';
import { visitController } from '../controllers/visitController.js';
import { validateBody } from '../middleware/validation.js';
import { visitSchema } from '../lib/validation.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.get('/', visitController.index);
router.get('/new', requireRole(Role.DOCTOR), visitController.showForm);
router.get('/:id', visitController.show);
router.get('/:id/edit', requireRole(Role.DOCTOR), visitController.showForm);
router.post('/', requireRole(Role.DOCTOR), validateBody(visitSchema), visitController.create);
router.put('/:id', requireRole(Role.DOCTOR), validateBody(visitSchema), visitController.update);
router.delete('/:id', requireRole(Role.DOCTOR, Role.ADMIN), visitController.delete);

export default router;
