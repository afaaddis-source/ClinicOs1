import express from 'express';
import { appointmentController } from '../controllers/appointmentController.js';
import { validateBody } from '../middleware/validation.js';
import { appointmentSchema } from '../lib/validation.js';

const router = express.Router();

router.get('/', appointmentController.index);
router.get('/new', appointmentController.showForm);
router.get('/:id', appointmentController.show);
router.get('/:id/edit', appointmentController.showForm);
router.post('/', validateBody(appointmentSchema), appointmentController.create);
router.put('/:id', validateBody(appointmentSchema), appointmentController.update);
router.delete('/:id', appointmentController.delete);
router.patch('/:id/status', appointmentController.updateStatus);

export default router;
