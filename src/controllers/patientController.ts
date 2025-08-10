import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const patientController = {
  index: async (req: Request, res: Response) => {
    try {
      const { search, page = '1' } = req.query;
      const limit = 20;
      const offset = (parseInt(page as string) - 1) * limit;

      const where = search ? {
        OR: [
          { name: { contains: search as string } },
          { civilId: { contains: search as string } },
          { phone: { contains: search as string } }
        ]
      } : {};

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.patient.count({ where })
      ]);

      res.render('patients/index', {
        title: req.t('patients.title'),
        patients,
        pagination: {
          current: parseInt(page as string),
          total: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        },
        search: search as string || ''
      });
    } catch (error) {
      console.error('Patients index error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  show: async (req: Request, res: Response) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: req.params.id },
        include: {
          appointments: {
            include: { service: true, doctor: true },
            orderBy: { start: 'desc' }
          },
          visits: {
            include: { doctor: true },
            orderBy: { date: 'desc' }
          },
          invoices: {
            include: { payments: true },
            orderBy: { issuedAt: 'desc' }
          }
        }
      });

      if (!patient) {
        return res.status(404).render('error', {
          title: req.t('error.not_found_title'),
          message: req.t('patients.not_found'),
          code: 404
        });
      }

      res.render('patients/show', {
        title: `${req.t('patients.patient')}: ${patient.name}`,
        patient
      });
    } catch (error) {
      console.error('Patient show error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  showForm: async (req: Request, res: Response) => {
    try {
      const isEdit = !!req.params.id;
      let patient = null;

      if (isEdit) {
        patient = await prisma.patient.findUnique({
          where: { id: req.params.id }
        });

        if (!patient) {
          return res.status(404).render('error', {
            title: req.t('error.not_found_title'),
            message: req.t('patients.not_found'),
            code: 404
          });
        }
      }

      res.render('patients/form', {
        title: isEdit ? req.t('patients.edit') : req.t('patients.add_new'),
        patient,
        isEdit
      });
    } catch (error) {
      console.error('Patient form error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { dob, ...data } = req.body;
      
      const patient = await prisma.patient.create({
        data: {
          ...data,
          dob: dob ? new Date(dob) : null
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Patient',
          entityId: patient.id,
          action: 'CREATE',
          diffJson: JSON.stringify(patient)
        }
      });

      res.redirect(`/patients/${patient.id}?success=${encodeURIComponent(req.t('patients.created_successfully'))}`);
    } catch (error) {
      console.error('Patient create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { dob, ...data } = req.body;
      
      const patient = await prisma.patient.update({
        where: { id: req.params.id },
        data: {
          ...data,
          dob: dob ? new Date(dob) : null
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Patient',
          entityId: patient.id,
          action: 'UPDATE',
          diffJson: JSON.stringify(patient)
        }
      });

      res.redirect(`/patients/${patient.id}?success=${encodeURIComponent(req.t('patients.updated_successfully'))}`);
    } catch (error) {
      console.error('Patient update error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await prisma.patient.delete({
        where: { id: req.params.id }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Patient',
          entityId: req.params.id,
          action: 'DELETE'
        }
      });

      res.redirect(`/patients?success=${encodeURIComponent(req.t('patients.deleted_successfully'))}`);
    } catch (error) {
      console.error('Patient delete error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  }
};
