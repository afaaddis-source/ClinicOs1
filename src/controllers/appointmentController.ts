import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppointmentStatus } from '@prisma/client';

export const appointmentController = {
  index: async (req: Request, res: Response) => {
    try {
      const { date, status, doctor } = req.query;
      const filterDate = date ? new Date(date as string) : new Date();
      
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      const where: any = {
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      };

      if (status) where.status = status;
      if (doctor) where.doctorId = doctor;

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          service: true,
          doctor: true
        },
        orderBy: { start: 'asc' }
      });

      const doctors = await prisma.user.findMany({
        where: { role: 'DOCTOR' }
      });

      res.render('appointments/index', {
        title: req.t('appointments.title'),
        appointments,
        doctors,
        filters: { date: filterDate.toISOString().split('T')[0], status, doctor }
      });
    } catch (error) {
      console.error('Appointments index error:', error);
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
      let appointment = null;

      if (isEdit) {
        appointment = await prisma.appointment.findUnique({
          where: { id: req.params.id },
          include: { patient: true, service: true, doctor: true }
        });

        if (!appointment) {
          return res.status(404).render('error', {
            title: req.t('error.not_found_title'),
            message: req.t('appointments.not_found'),
            code: 404
          });
        }
      }

      const [patients, services, doctors] = await Promise.all([
        prisma.patient.findMany({ orderBy: { name: 'asc' } }),
        prisma.service.findMany({ orderBy: { nameAr: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'DOCTOR' },
          orderBy: { username: 'asc' }
        })
      ]);

      res.render('appointments/form', {
        title: isEdit ? req.t('appointments.edit') : req.t('appointments.add_new'),
        appointment,
        patients,
        services,
        doctors,
        isEdit
      });
    } catch (error) {
      console.error('Appointment form error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { start, serviceId, ...data } = req.body;
      
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(400).json({
          success: false,
          message: req.t('services.not_found')
        });
      }

      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + service.defaultMinutes * 60000);

      const appointment = await prisma.appointment.create({
        data: {
          ...data,
          serviceId,
          start: startDate,
          end: endDate
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Appointment',
          entityId: appointment.id,
          action: 'CREATE',
          diffJson: JSON.stringify(appointment)
        }
      });

      res.redirect(`/appointments?success=${encodeURIComponent(req.t('appointments.created_successfully'))}`);
    } catch (error) {
      console.error('Appointment create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { start, serviceId, ...data } = req.body;
      
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(400).json({
          success: false,
          message: req.t('services.not_found')
        });
      }

      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + service.defaultMinutes * 60000);

      const appointment = await prisma.appointment.update({
        where: { id: req.params.id },
        data: {
          ...data,
          serviceId,
          start: startDate,
          end: endDate
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Appointment',
          entityId: appointment.id,
          action: 'UPDATE',
          diffJson: JSON.stringify(appointment)
        }
      });

      res.redirect(`/appointments?success=${encodeURIComponent(req.t('appointments.updated_successfully'))}`);
    } catch (error) {
      console.error('Appointment update error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      
      const appointment = await prisma.appointment.update({
        where: { id: req.params.id },
        data: { status: status as AppointmentStatus }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Appointment',
          entityId: appointment.id,
          action: 'STATUS_UPDATE',
          diffJson: JSON.stringify({ status })
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Appointment status update error:', error);
      res.status(500).json({
        success: false,
        message: req.t('error.server_message')
      });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await prisma.appointment.delete({
        where: { id: req.params.id }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Appointment',
          entityId: req.params.id,
          action: 'DELETE'
        }
      });

      res.redirect(`/appointments?success=${encodeURIComponent(req.t('appointments.deleted_successfully'))}`);
    } catch (error) {
      console.error('Appointment delete error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  show: async (req: Request, res: Response) => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          service: true,
          doctor: true,
          visit: true
        }
      });

      if (!appointment) {
        return res.status(404).render('error', {
          title: req.t('error.not_found_title'),
          message: req.t('appointments.not_found'),
          code: 404
        });
      }

      res.render('appointments/show', {
        title: `${req.t('appointments.appointment')}: ${appointment.patient.name}`,
        appointment
      });
    } catch (error) {
      console.error('Appointment show error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  }
};
