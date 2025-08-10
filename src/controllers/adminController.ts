import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';

export const adminController = {
  users: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { username: 'asc' }
      });

      res.render('admin/users', {
        title: req.t('admin.users_title'),
        users
      });
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  showUserForm: (req: Request, res: Response) => {
    res.render('admin/user-form', {
      title: req.t('admin.add_user')
    });
  },

  createUser: async (req: Request, res: Response) => {
    try {
      const { username, password, role } = req.body;
      
      const passwordHash = await bcrypt.hash(password, 12);
      
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash,
          role
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'User',
          entityId: user.id,
          action: 'CREATE',
          diffJson: JSON.stringify({ username, role })
        }
      });

      res.redirect(`/admin/users?success=${encodeURIComponent(req.t('admin.user_created_successfully'))}`);
    } catch (error) {
      console.error('User create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      await prisma.user.delete({
        where: { id: req.params.id }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'User',
          entityId: req.params.id,
          action: 'DELETE'
        }
      });

      res.redirect(`/admin/users?success=${encodeURIComponent(req.t('admin.user_deleted_successfully'))}`);
    } catch (error) {
      console.error('User delete error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  services: async (req: Request, res: Response) => {
    try {
      const services = await prisma.service.findMany({
        orderBy: { nameAr: 'asc' }
      });

      res.render('admin/services', {
        title: req.t('admin.services_title'),
        services
      });
    } catch (error) {
      console.error('Admin services error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  showServiceForm: (req: Request, res: Response) => {
    res.render('admin/service-form', {
      title: req.t('admin.add_service')
    });
  },

  createService: async (req: Request, res: Response) => {
    try {
      const service = await prisma.service.create({
        data: req.body
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Service',
          entityId: service.id,
          action: 'CREATE',
          diffJson: JSON.stringify(service)
        }
      });

      res.redirect(`/admin/services?success=${encodeURIComponent(req.t('admin.service_created_successfully'))}`);
    } catch (error) {
      console.error('Service create error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  updateService: async (req: Request, res: Response) => {
    try {
      const service = await prisma.service.update({
        where: { id: req.params.id },
        data: req.body
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Service',
          entityId: service.id,
          action: 'UPDATE',
          diffJson: JSON.stringify(service)
        }
      });

      res.redirect(`/admin/services?success=${encodeURIComponent(req.t('admin.service_updated_successfully'))}`);
    } catch (error) {
      console.error('Service update error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  },

  deleteService: async (req: Request, res: Response) => {
    try {
      await prisma.service.delete({
        where: { id: req.params.id }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.session.user!.id,
          entity: 'Service',
          entityId: req.params.id,
          action: 'DELETE'
        }
      });

      res.redirect(`/admin/services?success=${encodeURIComponent(req.t('admin.service_deleted_successfully'))}`);
    } catch (error) {
      console.error('Service delete error:', error);
      res.status(500).render('error', {
        title: req.t('error.server_title'),
        message: req.t('error.server_message'),
        code: 500
      });
    }
  }
};
