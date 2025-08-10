import express from 'express';
import { billingController } from '../controllers/billingController.js';
import { validateBody } from '../middleware/validation.js';
import { invoiceSchema, paymentSchema } from '../lib/validation.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.get('/', requireRole(Role.ACCOUNTANT, Role.ADMIN), billingController.index);
router.get('/invoices/new', requireRole(Role.ACCOUNTANT, Role.ADMIN), billingController.showInvoiceForm);
router.get('/invoices/:id', requireRole(Role.ACCOUNTANT, Role.ADMIN), billingController.showInvoice);
router.post('/invoices', requireRole(Role.ACCOUNTANT, Role.ADMIN), validateBody(invoiceSchema), billingController.createInvoice);
router.post('/payments', requireRole(Role.ACCOUNTANT, Role.ADMIN), validateBody(paymentSchema), billingController.createPayment);

export default router;
