import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { InvoiceStatus } from '@prisma/client';

export const billingController = {
  index: async (req: Request, res: Response) => {
    try {
      const { status, patient, page = '1' } = req.query;
      const limit = 20;
      const offset = (parseInt(page as string) - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (patient) where.patientId = patient;

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            patient: true,
            payments: true,
            items: { include: { service: true } }
          },
          skip: offset,
          take: limit,
          orderBy: { issuedAt: 'desc' }
        }),
        prisma.invoice.count({ where })
      ]);

      const patients = await prisma.patient.findMany({
        orderBy: { name: 'asc' }
      });

      res.render('billing/index', {
        title: req.t('billing.title'),
        invoices,
        patients,
        filters: { status, patient },
        pagination: {
          current: parseInt(page as string),
          total: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        }
      });
    } catch (error) {
      console.error('Billing index error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  showInvoice: async (req: Request, res: Response) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          items: { include: { service: true } },
          payments: { include: { createdByUser: true } }
        }
      });

      if (!invoice) {
        return res.status(404).render('error', {
          title: req.t('error.not_found_title'),
          message: req.t('billing.invoice_not_found'),
          code: 404
        });
      }

      res.render('billing/invoice', {
        title: `${req.t('billing.invoice')}: ${invoice.id}`,
        invoice
      });
    } catch (error) {
      console.error('Invoice show error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  showInvoiceForm: async (req: Request, res: Response) => {
    try {
      const [patients, services] = await Promise.all([
        prisma.patient.findMany({ orderBy: { name: 'asc' } }),
        prisma.service.findMany({ orderBy: { nameAr: 'asc' } })
      ]);

      res.render('billing/invoice-form', {
        title: req.t('billing.create_invoice'),
        patients,
        services
      });
    } catch (error) {
      console.error('Invoice form error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  createInvoice: async (req: Request, res: Response) => {
    try {
      const { patientId, items, discount = 0, tax = 0 } = req.body;

      const total = items.reduce((sum: number, item: any) => 
        sum + (item.qty * item.price), 0) - discount + tax;

      const invoice = await prisma.invoice.create({
        data: {
          patientId,
          total,
          discount,
          tax,
          items: {
            create: items
          }
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Invoice',
          entityId: invoice.id,
          action: 'CREATE',
          diffJson: JSON.stringify(invoice)
        }
      });

      res.redirect(`/billing/invoices/${invoice.id}?success=${encodeURIComponent(req.t('billing.invoice_created_successfully'))}`);
    } catch (error) {
      console.error('Invoice create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  createPayment: async (req: Request, res: Response) => {
    try {
      const { invoiceId, amount, method, txnRef } = req.body;

      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amount: parseFloat(amount),
          method,
          txnRef,
          createdBy: req.session.user!.id
        }
      });

      // Update invoice status
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        let status: InvoiceStatus = 'UNPAID';
        
        if (totalPaid >= invoice.total) {
          status = 'PAID';
        } else if (totalPaid > 0) {
          status = 'PARTIAL';
        }

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status }
        });
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Payment',
          entityId: payment.id,
          action: 'CREATE',
          diffJson: JSON.stringify(payment)
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Payment create error:', error);
      res.status(500).json({
        success: false,
        message: req.t('error.server_message')
      });
    }
  }
};
