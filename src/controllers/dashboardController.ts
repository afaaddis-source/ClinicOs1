import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppointmentStatus } from '@prisma/client';

export const dashboardController = {
  index: async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's appointments
      const todayAppointments = await prisma.appointment.findMany({
        where: {
          start: {
            gte: today,
            lt: tomorrow
          }
        },
        include: {
          patient: true,
          service: true,
          doctor: true
        },
        orderBy: {
          start: 'asc'
        }
      });

      // Get statistics
      const [totalPatients, totalAppointmentsToday, pendingInvoices, monthlyRevenue] = await Promise.all([
        prisma.patient.count(),
        prisma.appointment.count({
          where: {
            start: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.invoice.aggregate({
          where: {
            status: { not: 'PAID' }
          },
          _sum: {
            total: true
          }
        }),
        prisma.payment.aggregate({
          where: {
            paidAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1)
            }
          },
          _sum: {
            amount: true
          }
        })
      ]);

      // Get recent patients
      const recentPatients = await prisma.patient.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.render('dashboard/index', {
        title: req.t('dashboard.title'),
        stats: {
          totalPatients,
          todayAppointments: totalAppointmentsToday,
          pendingPayments: pendingInvoices._sum.total || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0
        },
        todayAppointments,
        recentPatients
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  }
};
