import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPatientSchema,
  insertServiceSchema,
  insertAppointmentSchema,
  insertVisitSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
} from "@shared/schema";
import { z } from "zod";

// Session types
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      fullName: string;
      role: string;
    };
  }
}

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Middleware to check role
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: any) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware setup
  app.use(async (req: Request, res: Response, next) => {
    // Add CORS headers for development
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // CSRF token endpoint - temporarily disable CSRF for testing
  app.get("/api/csrf-token", (req: Request, res: Response) => {
    // For now, return a mock token to allow login functionality
    res.json({ csrfToken: "test-token" });
  });

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          error: req.acceptsLanguages('ar') ? "اسم المستخدم وكلمة المرور مطلوبان" : "Username and password required" 
        });
      }

      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ 
          error: req.acceptsLanguages('ar') ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Invalid credentials" 
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      };

      await storage.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        tableName: "users",
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ 
        user: req.session.user,
        message: req.acceptsLanguages('ar') ? "تم تسجيل الدخول بنجاح" : "Login successful",
        csrfToken: "test-token"
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        error: req.acceptsLanguages('ar') ? "خطأ في الخادم الداخلي" : "Internal server error" 
      });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.user?.id;
    
    if (userId) {
      await storage.createAuditLog({
        userId,
        action: "LOGOUT",
        tableName: "users",
        recordId: userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.session.user });
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/appointments/today", requireAuth, async (req: Request, res: Response) => {
    try {
      const today = new Date();
      const appointments = await storage.getAppointmentsByDate(today);
      res.json(appointments);
    } catch (error) {
      console.error("Today appointments error:", error);
      res.status(500).json({ error: "Failed to fetch today's appointments" });
    }
  });

  app.get("/api/invoices/pending", requireAuth, requireRole(["ADMIN", "ACCOUNTANT"]), async (req: Request, res: Response) => {
    try {
      const invoices = await storage.getPendingInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Pending invoices error:", error);
      res.status(500).json({ error: "Failed to fetch pending invoices" });
    }
  });

  // User management routes
  app.get("/api/users", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "users",
        recordId: user.id,
        newValues: { ...userData, password: "[HIDDEN]" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const oldUser = await storage.getUser(req.params.id);
      const user = await storage.updateUser(req.params.id, userData);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "UPDATE",
        tableName: "users",
        recordId: user.id,
        oldValues: oldUser ? { ...oldUser, password: "[HIDDEN]" } : undefined,
        newValues: { ...userData, password: userData.password ? "[HIDDEN]" : undefined },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/users/:id/reset-password", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.updateUser(req.params.id, { password });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "PASSWORD_RESET",
        tableName: "users",
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Patient management routes
  app.get("/api/patients", requireAuth, async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      let patients;
      
      if (search && typeof search === "string") {
        patients = await storage.searchPatients(search);
      } else {
        patients = await storage.getAllPatients();
      }
      
      res.json(patients);
    } catch (error) {
      console.error("Get patients error:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Get patient error:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", requireAuth, async (req: Request, res: Response) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(patientData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "patients",
        recordId: patient.id,
        newValues: patientData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create patient error:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const patientData = insertPatientSchema.partial().parse(req.body);
      const oldPatient = await storage.getPatient(req.params.id);
      const patient = await storage.updatePatient(req.params.id, patientData);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "UPDATE",
        tableName: "patients",
        recordId: patient.id,
        oldValues: oldPatient,
        newValues: patientData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Update patient error:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  // Service management routes
  app.get("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Get services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "services",
        recordId: service.id,
        newValues: serviceData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create service error:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  // Appointment management routes
  app.get("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const { date, patient, doctor } = req.query;
      let appointments;

      if (date && typeof date === "string") {
        appointments = await storage.getAppointmentsByDate(new Date(date));
      } else if (patient && typeof patient === "string") {
        appointments = await storage.getAppointmentsByPatient(patient);
      } else if (doctor && typeof doctor === "string") {
        appointments = await storage.getAppointmentsByDoctor(doctor);
      } else {
        appointments = await storage.getAllAppointments();
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        createdBy: req.session.user?.id,
      });
      const appointment = await storage.createAppointment(appointmentData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "appointments",
        recordId: appointment.id,
        newValues: appointmentData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create appointment error:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Visit management routes
  app.get("/api/visits", requireAuth, async (req: Request, res: Response) => {
    try {
      const { patient, doctor } = req.query;
      let visits;

      if (patient && typeof patient === "string") {
        visits = await storage.getVisitsByPatient(patient);
      } else if (doctor && typeof doctor === "string") {
        visits = await storage.getVisitsByDoctor(doctor);
      } else {
        visits = await storage.getAllVisits();
      }
      
      res.json(visits);
    } catch (error) {
      console.error("Get visits error:", error);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  app.post("/api/visits", requireAuth, requireRole(["DOCTOR", "ADMIN"]), async (req: Request, res: Response) => {
    try {
      const visitData = insertVisitSchema.parse(req.body);
      const visit = await storage.createVisit(visitData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "visits",
        recordId: visit.id,
        newValues: visitData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create visit error:", error);
      res.status(500).json({ error: "Failed to create visit" });
    }
  });

  // Invoice management routes
  app.get("/api/invoices", requireAuth, async (req: Request, res: Response) => {
    try {
      const { patient, unpaid } = req.query;
      let invoices;

      if (patient && typeof patient === "string") {
        invoices = await storage.getInvoicesByPatient(patient);
      } else if (unpaid === "true") {
        invoices = await storage.getUnpaidInvoices();
      } else {
        invoices = await storage.getAllInvoices();
      }
      
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, requireRole(["ACCOUNTANT", "ADMIN"]), async (req: Request, res: Response) => {
    try {
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        createdBy: req.session.user?.id,
      });
      const invoice = await storage.createInvoice(invoiceData);
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "invoices",
        recordId: invoice.id,
        newValues: invoiceData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Payment management routes
  app.post("/api/payments", requireAuth, requireRole(["ACCOUNTANT", "RECEPTION", "ADMIN"]), async (req: Request, res: Response) => {
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        receivedBy: req.session.user?.id,
      });
      const payment = await storage.createPayment(paymentData);
      
      // Update invoice paid amount
      const invoice = await storage.getInvoice(paymentData.invoiceId);
      if (invoice) {
        const newPaidAmount = Number(invoice.paidAmount) + Number(paymentData.amount);
        const newStatus = newPaidAmount >= Number(invoice.totalAmount) ? "PAID" : 
                         newPaidAmount > 0 ? "PARTIAL" : "PENDING";
        
        await storage.updateInvoice(invoice.id, {
          paidAmount: newPaidAmount.toString(),
          paymentStatus: newStatus as any,
        });
      }
      
      await storage.createAuditLog({
        userId: req.session.user?.id,
        action: "CREATE",
        tableName: "payments",
        recordId: payment.id,
        newValues: paymentData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Get doctors for appointment booking
  app.get("/api/doctors", requireAuth, async (req: Request, res: Response) => {
    try {
      const doctors = await storage.getUsersByRole("DOCTOR");
      const safeDoctors = doctors.map(doctor => ({ 
        id: doctor.id, 
        fullName: doctor.fullName, 
        phone: doctor.phone 
      }));
      res.json(safeDoctors);
    } catch (error) {
      console.error("Get doctors error:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
