import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'ADMIN' | 'DOCTOR' | 'RECEPTION' | 'ACCOUNTANT';
    fullName: string;
  };
}

// Authentication middleware
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.user) {
    return res.status(401).json({
      error: "AUTHENTICATION_REQUIRED",
      message: "Authentication required. Please log in to access this resource.",
      code: "UNAUTHORIZED"
    });
  }

  req.user = req.session.user;
  next();
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        code: "FORBIDDEN",
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Permission-based authorization for specific actions
export const requirePermission = (action: string, resource: string) => {
  const permissions = {
    // Admin permissions - full access
    ADMIN: {
      users: ['create', 'read', 'update', 'delete'],
      patients: ['create', 'read', 'update', 'delete'],
      appointments: ['create', 'read', 'update', 'delete'],
      visits: ['create', 'read', 'update', 'delete'],
      billing: ['create', 'read', 'update', 'delete'],
      services: ['create', 'read', 'update', 'delete'],
      settings: ['create', 'read', 'update', 'delete'],
      reports: ['read']
    },

    // Doctor permissions
    DOCTOR: {
      patients: ['create', 'read', 'update'],
      appointments: ['read', 'update'],
      visits: ['create', 'read', 'update'],
      billing: ['read'],
      services: ['read']
    },

    // Reception permissions
    RECEPTION: {
      patients: ['create', 'read', 'update'],
      appointments: ['create', 'read', 'update', 'delete'],
      visits: ['create', 'read'],
      billing: ['create', 'read'],
      services: ['read']
    },

    // Accountant permissions
    ACCOUNTANT: {
      patients: ['read'],
      appointments: ['read'],
      visits: ['read'],
      billing: ['create', 'read', 'update'],
      services: ['read'],
      reports: ['read']
    }
  } as const;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const userPermissions = permissions[req.user.role as keyof typeof permissions];
    const resourcePermissions = userPermissions?.[resource as keyof typeof userPermissions] as string[] | undefined;

    if (!resourcePermissions || !resourcePermissions.includes(action)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Access denied. Cannot ${action} ${resource}. Contact administrator for access.`,
        code: "FORBIDDEN",
        action,
        resource,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware to check if user can access specific patient data
export const requirePatientAccess = (patientIdParam = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const patientId = req.params[patientIdParam];
    
    // Admin and reception can access all patients
    if (req.user.role === 'ADMIN' || req.user.role === 'RECEPTION') {
      return next();
    }

    // Doctors and accountants might have restricted patient access in the future
    // For now, we'll allow access to all patients for these roles
    // This can be enhanced later with patient assignment logic
    
    next();
  };
};

// Error handler for authentication/authorization errors
export const authErrorHandler = (
  error: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Handle CSRF errors with friendly messages
  if (error.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: "CSRF_ERROR",
      message: "Your session has expired for security reasons. Please refresh the page and try again.",
      code: "EBADCSRFTOKEN"
    });
  }

  // Handle file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: "FILE_TOO_LARGE",
      message: "File size exceeds the maximum limit of 10MB.",
      code: "LIMIT_FILE_SIZE"
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: "INVALID_FILE_TYPE",
      message: "File type not allowed. Only images (JPG, PNG, PDF) and documents are permitted.",
      code: "LIMIT_UNEXPECTED_FILE"
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid data provided. Please check your input and try again.",
      code: "VALIDATION_ERROR",
      details: error.details || {}
    });
  }

  // Generic error
  console.error('Auth/Authorization Error:', error);
  next(error);
};

// Session validation middleware
export const validateSession = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Check if session exists and is valid
  if (req.session && req.session.user) {
    // Check session expiry
    const now = Date.now();
    const sessionCreated = req.session.user.sessionCreated || now;
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (now - sessionCreated > sessionDuration) {
      // Session expired
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      return res.status(401).json({
        error: "SESSION_EXPIRED",
        message: "Your session has expired. Please log in again.",
        code: "SESSION_EXPIRED"
      });
    }

    // Update session activity
    req.session.user.lastActivity = now;
  }

  next();
};

// Rate limiting for sensitive operations
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.ip + (req.user?.id || 'anonymous');
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
};

// Audit logging middleware
export const auditLog = (action: string, resource: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after successful response
      if (res.statusCode < 400) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          userId: req.user?.id,
          username: req.user?.username,
          action,
          resource,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode
        };
        
        // In a real application, you would save this to the audit log table
        console.log('AUDIT:', JSON.stringify(logEntry));
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};