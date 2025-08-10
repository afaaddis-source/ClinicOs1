import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session?.user?.role as Role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).render('error', {
        title: req.t('error.access_denied_title'),
        message: req.t('error.access_denied_message'),
        code: 403
      });
    }
    
    next();
  };
}

export function canAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}
