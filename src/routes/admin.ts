import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { validateBody } from '../middleware/validation.js';
import { serviceSchema, userSchema } from '../lib/validation.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.get('/users', requireRole(Role.ADMIN), adminController.users);
router.get('/users/new', requireRole(Role.ADMIN), adminController.showUserForm);
router.post('/users', requireRole(Role.ADMIN), validateBody(userSchema), adminController.createUser);
router.delete('/users/:id', requireRole(Role.ADMIN), adminController.deleteUser);

router.get('/services', requireRole(Role.ADMIN), adminController.services);
router.get('/services/new', requireRole(Role.ADMIN), adminController.showServiceForm);
router.post('/services', requireRole(Role.ADMIN), validateBody(serviceSchema), adminController.createService);
router.put('/services/:id', requireRole(Role.ADMIN), validateBody(serviceSchema), adminController.updateService);
router.delete('/services/:id', requireRole(Role.ADMIN), adminController.deleteService);

export default router;
