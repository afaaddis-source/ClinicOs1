import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';

export const authController = {
  showLogin: (req: Request, res: Response) => {
    res.render('auth/login', {
      title: req.t('auth.login_title'),
      error: null
    });
  },

  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.render('auth/login', {
          title: req.t('auth.login_title'),
          error: req.t('auth.invalid_credentials')
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      res.render('auth/login', {
        title: req.t('auth.login_title'),
        error: req.t('error.server_message')
      });
    }
  },

  logout: (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/auth/login');
    });
  }
};
