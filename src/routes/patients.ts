import express from 'express';
import { patientController } from '../controllers/patientController.js';
import { validateBody } from '../middleware/validation.js';
import { patientSchema } from '../lib/validation.js';

const router = express.Router();

router.get('/', patientController.index);
router.get('/new', patientController.showForm);
router.get('/:id', patientController.show);
router.get('/:id/edit', patientController.showForm);
router.post('/', validateBody(patientSchema), patientController.create);
router.put('/:id', validateBody(patientSchema), patientController.update);
router.delete('/:id', patientController.delete);

export default router;
