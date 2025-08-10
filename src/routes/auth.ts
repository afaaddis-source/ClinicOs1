import express from 'express';
import { authController } from '../controllers/authController.js';
import { validateBody } from '../middleware/validation.js';
import { loginSchema } from '../lib/validation.js';
import { redirectIfAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/login', redirectIfAuth('/dashboard'), authController.showLogin);
router.post('/login', redirectIfAuth('/dashboard'), validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);

export default router;
