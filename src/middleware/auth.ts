import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.redirect('/auth/login');
  }
  next();
}

export function redirectIfAuth(redirectTo: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.user) {
      return res.redirect('/dashboard');
    }
    next();
  };
}
