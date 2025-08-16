import { PrismaClient, Role } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export interface IStorage {
  // User management
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, user: Partial<any>): Promise<any | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<any[]>;
  getUsersByRole(role: string): Promise<any[]>;
  authenticateUser(username: string, password: string): Promise<any | undefined>;

  // Basic methods for other entities (returning empty data for now)
  getAllPatients(): Promise<any[]>;
  getPatient(id: string): Promise<any | undefined>;
  getPatientByCivilId(civilId: string): Promise<any | undefined>;
  createPatient(patient: any): Promise<any>;
  updatePatient(id: string, patient: Partial<any>): Promise<any | undefined>;
  deletePatient(id: string): Promise<boolean>;
  searchPatients(searchTerm: string): Promise<any[]>;

  // Services
  getAllServices(): Promise<any[]>;
  getService(id: string): Promise<any | undefined>;
  createService(service: any): Promise<any>;
  updateService(id: string, service: Partial<any>): Promise<any | undefined>;
  deleteService(id: string): Promise<boolean>;
  getActiveServices(): Promise<any[]>;

  // Appointments
  getAllAppointments(): Promise<any[]>;
  getAppointment(id: string): Promise<any | undefined>;
  createAppointment(appointment: any): Promise<any>;
  updateAppointment(id: string, appointment: Partial<any>): Promise<any | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  getAppointmentsByDate(date: Date): Promise<any[]>;
  getAppointmentsByPatient(patientId: string): Promise<any[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<any[]>;
  getAvailableTimeSlots(date: Date, doctorId?: string, excludeAppointmentId?: string): Promise<string[]>;
  checkAppointmentConflict(appointmentDate: Date, duration: number, doctorId: string, excludeAppointmentId?: string): Promise<boolean>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]>;
  getWeeklyAppointments(startOfWeek: Date): Promise<any[]>;

  // Visits
  getAllVisits(): Promise<any[]>;
  getVisit(id: string): Promise<any | undefined>;
  createVisit(visit: any): Promise<any>;
  updateVisit(id: string, visit: Partial<any>): Promise<any | undefined>;
  deleteVisit(id: string): Promise<boolean>;
  getVisitsByPatient(patientId: string): Promise<any[]>;
  getVisitsByDoctor(doctorId: string): Promise<any[]>;

  // Invoices
  getAllInvoices(): Promise<any[]>;
  getInvoice(id: string): Promise<any | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<any | undefined>;
  createInvoice(invoice: any): Promise<any>;
  updateInvoice(id: string, invoice: Partial<any>): Promise<any | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getInvoicesByPatient(patientId: string): Promise<any[]>;
  getUnpaidInvoices(): Promise<any[]>;
  getPendingInvoices(): Promise<any[]>;

  // Invoice Items
  getInvoiceItems(invoiceId: string): Promise<any[]>;
  createInvoiceItem(item: any): Promise<any>;
  updateInvoiceItem(id: string, item: Partial<any>): Promise<any | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;

  // Payments
  getPayment(id: string): Promise<any | undefined>;
  createPayment(payment: any): Promise<any>;
  updatePayment(id: string, payment: Partial<any>): Promise<any | undefined>;
  deletePayment(id: string): Promise<boolean>;
  getPaymentsByInvoice(invoiceId: string): Promise<any[]>;
  getAllPayments(): Promise<any[]>;

  // Patient Files
  getPatientFiles(patientId: string): Promise<any[]>;
  createPatientFile(file: any): Promise<any>;
  deletePatientFile(id: string): Promise<boolean>;
  getPatientFile(id: string): Promise<any | undefined>;

  // Audit logging
  createAuditLog(log: any): Promise<void>;
  getAuditLogs(limit?: number): Promise<any[]>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    monthlyRevenue: number;
    todayAppointments: number;
    pendingPayments: number;
  }>;

  // Settings
  getSetting(key: string): Promise<any | undefined>;
  getSettingsByCategory(category: string): Promise<any[]>;
  getAllSettings(): Promise<any[]>;
  createSetting(setting: any): Promise<any>;
  updateSetting(id: string, setting: Partial<any>): Promise<any | undefined>;
  deleteSetting(id: string): Promise<boolean>;

  // Clinic Info
  getClinicInfo(): Promise<any | undefined>;
  createClinicInfo(info: any): Promise<any>;
  updateClinicInfo(id: string, info: Partial<any>): Promise<any | undefined>;

  // Reports
  getRevenueByMonth(): Promise<any[]>;
  getVisitsByService(): Promise<any[]>;
  getNoShowStats(): Promise<any>;
  getAgingReceivables(): Promise<any>;
  isServiceReferenced(serviceId: string): Promise<boolean>;
}

export class PrismaStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<any | undefined> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  async createUser(user: any): Promise<any> {
    const hashedPassword = await bcryptjs.hash(user.password, 12);
    return await prisma.user.create({
      data: {
        ...user,
        passwordHash: hashedPassword,
      },
    });
  }

  async updateUser(id: string, user: Partial<any>): Promise<any | undefined> {
    const updateData: any = { ...user };
    if (updateData.password) {
      updateData.passwordHash = await bcryptjs.hash(updateData.password, 12);
      delete updateData.password;
    }
    
    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllUsers(): Promise<any[]> {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUsersByRole(role: string): Promise<any[]> {
    return await prisma.user.findMany({
      where: { role: role as Role },
      orderBy: { username: 'asc' },
    });
  }

  async authenticateUser(username: string, password: string): Promise<any | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      console.log("User not found:", username);
      return undefined;
    }
    
    console.log("Comparing password for user:", user.username);
    const isValid = await bcryptjs.compare(password, user.passwordHash);
    console.log("Password comparison result:", isValid);
    
    return isValid ? { ...user, fullName: user.username, isActive: true } : undefined;
  }

  // Patient management - basic implementations
  async getAllPatients(): Promise<any[]> {
    return await prisma.patient.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPatient(id: string): Promise<any | undefined> {
    return await prisma.patient.findUnique({
      where: { id },
    });
  }

  async getPatientByCivilId(civilId: string): Promise<any | undefined> {
    return await prisma.patient.findUnique({
      where: { civilId },
    });
  }

  async createPatient(patient: any): Promise<any> {
    return await prisma.patient.create({
      data: patient,
    });
  }

  async updatePatient(id: string, patient: Partial<any>): Promise<any | undefined> {
    return await prisma.patient.update({
      where: { id },
      data: patient,
    });
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      await prisma.patient.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async searchPatients(searchTerm: string): Promise<any[]> {
    return await prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
          { civilId: { contains: searchTerm } }
        ]
      },
      orderBy: { name: 'asc' },
    });
  }

  // Services
  async getAllServices(): Promise<any[]> {
    return await prisma.service.findMany({
      orderBy: { nameAr: 'asc' },
    });
  }

  async getService(id: string): Promise<any | undefined> {
    return await prisma.service.findUnique({
      where: { id },
    });
  }

  async createService(service: any): Promise<any> {
    return await prisma.service.create({
      data: service,
    });
  }

  async updateService(id: string, service: Partial<any>): Promise<any | undefined> {
    return await prisma.service.update({
      where: { id },
      data: service,
    });
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      await prisma.service.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getActiveServices(): Promise<any[]> {
    return await prisma.service.findMany({
      orderBy: { nameAr: 'asc' },
    });
  }

  // Appointments - basic implementations returning empty arrays for now
  async getAllAppointments(): Promise<any[]> { return []; }
  async getAppointment(id: string): Promise<any | undefined> { return undefined; }
  async createAppointment(appointment: any): Promise<any> { return {}; }
  async updateAppointment(id: string, appointment: Partial<any>): Promise<any | undefined> { return undefined; }
  async deleteAppointment(id: string): Promise<boolean> { return false; }
  async getAppointmentsByDate(date: Date): Promise<any[]> { return []; }
  async getAppointmentsByPatient(patientId: string): Promise<any[]> { return []; }
  async getAppointmentsByDoctor(doctorId: string): Promise<any[]> { return []; }
  async getAvailableTimeSlots(date: Date, doctorId?: string, excludeAppointmentId?: string): Promise<string[]> { return []; }
  async checkAppointmentConflict(appointmentDate: Date, duration: number, doctorId: string, excludeAppointmentId?: string): Promise<boolean> { return false; }
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]> { return []; }
  async getWeeklyAppointments(startOfWeek: Date): Promise<any[]> { return []; }

  // Visits - basic implementations
  async getAllVisits(): Promise<any[]> { return []; }
  async getVisit(id: string): Promise<any | undefined> { return undefined; }
  async createVisit(visit: any): Promise<any> { return {}; }
  async updateVisit(id: string, visit: Partial<any>): Promise<any | undefined> { return undefined; }
  async deleteVisit(id: string): Promise<boolean> { return false; }
  async getVisitsByPatient(patientId: string): Promise<any[]> { return []; }
  async getVisitsByDoctor(doctorId: string): Promise<any[]> { return []; }

  // Invoices - basic implementations
  async getAllInvoices(): Promise<any[]> { return []; }
  async getInvoice(id: string): Promise<any | undefined> { return undefined; }
  async getInvoiceByNumber(invoiceNumber: string): Promise<any | undefined> { return undefined; }
  async createInvoice(invoice: any): Promise<any> { return {}; }
  async updateInvoice(id: string, invoice: Partial<any>): Promise<any | undefined> { return undefined; }
  async deleteInvoice(id: string): Promise<boolean> { return false; }
  async getInvoicesByPatient(patientId: string): Promise<any[]> { return []; }
  async getUnpaidInvoices(): Promise<any[]> { return []; }
  async getPendingInvoices(): Promise<any[]> { return []; }

  // Invoice Items
  async getInvoiceItems(invoiceId: string): Promise<any[]> { return []; }
  async createInvoiceItem(item: any): Promise<any> { return {}; }
  async updateInvoiceItem(id: string, item: Partial<any>): Promise<any | undefined> { return undefined; }
  async deleteInvoiceItem(id: string): Promise<boolean> { return false; }

  // Payments
  async getPayment(id: string): Promise<any | undefined> { return undefined; }
  async createPayment(payment: any): Promise<any> { return {}; }
  async updatePayment(id: string, payment: Partial<any>): Promise<any | undefined> { return undefined; }
  async deletePayment(id: string): Promise<boolean> { return false; }
  async getPaymentsByInvoice(invoiceId: string): Promise<any[]> { return []; }
  async getAllPayments(): Promise<any[]> { return []; }

  // Patient Files
  async getPatientFiles(patientId: string): Promise<any[]> { return []; }
  async createPatientFile(file: any): Promise<any> { return {}; }
  async deletePatientFile(id: string): Promise<boolean> { return false; }
  async getPatientFile(id: string): Promise<any | undefined> { return undefined; }

  // Audit logging
  async createAuditLog(log: any): Promise<void> {
    // For now, just log to console
    console.log('Audit Log:', log);
  }

  async getAuditLogs(limit?: number): Promise<any[]> { return []; }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    monthlyRevenue: number;
    todayAppointments: number;
    pendingPayments: number;
  }> {
    const totalPatients = await prisma.patient.count();
    return {
      totalPatients,
      totalAppointments: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      todayAppointments: 0,
      pendingPayments: 0,
    };
  }

  // Settings
  async getSetting(key: string): Promise<any | undefined> { return undefined; }
  async getSettingsByCategory(category: string): Promise<any[]> { return []; }
  async getAllSettings(): Promise<any[]> { return []; }
  async createSetting(setting: any): Promise<any> { return {}; }
  async updateSetting(id: string, setting: Partial<any>): Promise<any | undefined> { return undefined; }
  async deleteSetting(id: string): Promise<boolean> { return false; }

  // Clinic Info
  async getClinicInfo(): Promise<any | undefined> { return undefined; }
  async createClinicInfo(info: any): Promise<any> { return {}; }
  async updateClinicInfo(id: string, info: Partial<any>): Promise<any | undefined> { return undefined; }

  // Reports
  async getRevenueByMonth(): Promise<any[]> { return []; }
  async getVisitsByService(): Promise<any[]> { return []; }
  async getNoShowStats(): Promise<any> { return {}; }
  async getAgingReceivables(): Promise<any> { return {}; }
  async isServiceReferenced(serviceId: string): Promise<boolean> { return false; }
}

export const storage = new PrismaStorage();