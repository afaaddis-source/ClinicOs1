import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const visitController = {
  index: async (req: Request, res: Response) => {
    try {
      const { patient, doctor, page = '1' } = req.query;
      const limit = 20;
      const offset = (parseInt(page as string) - 1) * limit;

      const where: any = {};
      if (patient) where.patientId = patient;
      if (doctor) where.doctorId = doctor;

      const [visits, total] = await Promise.all([
        prisma.visit.findMany({
          where,
          include: {
            patient: true,
            doctor: true,
            appointment: true
          },
          skip: offset,
          take: limit,
          orderBy: { date: 'desc' }
        }),
        prisma.visit.count({ where })
      ]);

      const [patients, doctors] = await Promise.all([
        prisma.patient.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'DOCTOR' },
          orderBy: { username: 'asc' }
        })
      ]);

      res.render('visits/index', {
        title: req.t('visits.title'),
        visits,
        patients,
        doctors,
        filters: { patient, doctor },
        pagination: {
          current: parseInt(page as string),
          total: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        }
      });
    } catch (error) {
      console.error('Visits index error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  show: async (req: Request, res: Response) => {
    try {
      const visit = await prisma.visit.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          doctor: true,
          appointment: { include: { service: true } },
          files: true
        }
      });

      if (!visit) {
        return res.status(404).render('error', {
          title: req.t('error.not_found_title'),
          message: req.t('visits.not_found'),
          code: 404
        });
      }

      res.render('visits/show', {
        title: `${req.t('visits.visit')}: ${visit.patient.name}`,
        visit
      });
    } catch (error) {
      console.error('Visit show error:', error);
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
      let visit = null;

      if (isEdit) {
        visit = await prisma.visit.findUnique({
          where: { id: req.params.id },
          include: { patient: true, doctor: true, appointment: true }
        });

        if (!visit) {
          return res.status(404).render('error', {
            title: req.t('error.not_found_title'),
            message: req.t('visits.not_found'),
            code: 404
          });
        }
      }

      const [patients, doctors, appointments] = await Promise.all([
        prisma.patient.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'DOCTOR' },
          orderBy: { username: 'asc' }
        }),
        prisma.appointment.findMany({
          where: { status: 'COMPLETED' },
          include: { patient: true, service: true },
          orderBy: { start: 'desc' }
        })
      ]);

      res.render('visits/form', {
        title: isEdit ? req.t('visits.edit') : req.t('visits.add_new'),
        visit,
        patients,
        doctors,
        appointments,
        isEdit
      });
    } catch (error) {
      console.error('Visit form error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const visit = await prisma.visit.create({
        data: {
          ...req.body,
          date: new Date()
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Visit',
          entityId: visit.id,
          action: 'CREATE',
          diffJson: JSON.stringify(visit)
        }
      });

      res.redirect(`/visits/${visit.id}?success=${encodeURIComponent(req.t('visits.created_successfully'))}`);
    } catch (error) {
      console.error('Visit create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const visit = await prisma.visit.update({
        where: { id: req.params.id },
        data: req.body
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Visit',
          entityId: visit.id,
          action: 'UPDATE',
          diffJson: JSON.stringify(visit)
        }
      });

      res.redirect(`/visits/${visit.id}?success=${encodeURIComponent(req.t('visits.updated_successfully'))}`);
    } catch (error) {
      console.error('Visit update error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await prisma.visit.delete({
        where: { id: req.params.id }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Visit',
          entityId: req.params.id,
          action: 'DELETE'
        }
      });

      res.redirect(`/visits?success=${encodeURIComponent(req.t('visits.deleted_successfully'))}`);
    } catch (error) {
      console.error('Visit delete error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  }
};
