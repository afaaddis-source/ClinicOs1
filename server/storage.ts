import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, like, desc, gte, lte, sql } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import {
  users,
  patients,
  services,
  appointments,
  visits,
  invoices,
  invoiceItems,
  payments,
  patientFiles,
  auditLogs,
  settings,
  clinicInfo,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Visit,
  type InsertVisit,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Payment,
  type InsertPayment,
  type PatientFile,
  type InsertPatientFile,
  type AuditLog,
  type Setting,
  type InsertSetting,
  type ClinicInfo,
  type InsertClinicInfo,
} from "@shared/schema";

import { db } from "../src/lib/db";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  authenticateUser(username: string, password: string): Promise<User | undefined>;

  // Patient management
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByCivilId(civilId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;
  getAllPatients(): Promise<Patient[]>;
  searchPatients(searchTerm: string): Promise<Patient[]>;

  // Patient file management
  getPatientFiles(patientId: string): Promise<PatientFile[]>;
  createPatientFile(file: InsertPatientFile): Promise<PatientFile>;
  deletePatientFile(id: string): Promise<boolean>;
  getPatientFile(id: string): Promise<PatientFile | undefined>;

  // Service management
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;
  getAllServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;

  // Appointment management
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;

  // Visit management
  getVisit(id: string): Promise<Visit | undefined>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined>;
  deleteVisit(id: string): Promise<boolean>;
  getAllVisits(): Promise<Visit[]>;
  getVisitsByPatient(patientId: string): Promise<Visit[]>;
  getVisitsByDoctor(doctorId: string): Promise<Visit[]>;

  // Invoice management
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByPatient(patientId: string): Promise<Invoice[]>;
  getUnpaidInvoices(): Promise<Invoice[]>;
  getPendingInvoices(): Promise<Invoice[]>;

  // Invoice Items management
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;

  // Payment management
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;

  // Audit logging
  createAuditLog(log: {
    userId?: string;
    action: string;
    tableName: string;
    recordId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    monthlyRevenue: number;
    todayAppointments: number;
    pendingPayments: number;
  }>;

  // Appointment queries
  getAppointmentsByDate(date: Date): Promise<any[]>;
  getAvailableTimeSlots(date: Date, doctorId?: string, excludeAppointmentId?: string): Promise<string[]>;
  checkAppointmentConflict(appointmentDate: Date, duration: number, doctorId: string, excludeAppointmentId?: string): Promise<boolean>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]>;
  getWeeklyAppointments(startOfWeek: Date): Promise<any[]>;
  getMonthlyAppointments(startOfMonth: Date, endOfMonth: Date): Promise<any[]>;

  // Settings management
  getSetting(key: string): Promise<Setting | undefined>;
  getSettingsByCategory(category: string): Promise<Setting[]>;
  getAllSettings(): Promise<Setting[]>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: string, setting: Partial<InsertSetting>): Promise<Setting | undefined>;
  deleteSetting(id: string): Promise<boolean>;

  // Clinic Info management
  getClinicInfo(): Promise<ClinicInfo | undefined>;
  createClinicInfo(info: InsertClinicInfo): Promise<ClinicInfo>;
  updateClinicInfo(id: string, info: Partial<InsertClinicInfo>): Promise<ClinicInfo | undefined>;

  // Reports and Analytics
  getRevenueByMonth(): Promise<any[]>;
  getVisitsByService(): Promise<any[]>;
  getNoShowStats(): Promise<any>;
  getAgingReceivables(): Promise<any>;

  // Service checks for referential integrity
  isServiceReferenced(serviceId: string): Promise<boolean>;
}

export class PostgreSQLStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcryptjs.hash(user.password, 12);
    const result = await db.insert(users).values({
      ...user,
      passwordHash: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...user };
    if (updateData.password) {
      updateData.passwordHash = await bcryptjs.hash(updateData.password, 12);
      delete updateData.password; // Remove the plain password field
    }
    updateData.updatedAt = new Date();
    
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any)).orderBy(users.fullName);
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) {
      console.log("User not found or inactive:", { found: !!user, active: user?.isActive });
      return undefined;
    }
    
    console.log("Comparing password for user:", user.username);
    const isValid = await bcryptjs.compare(password, user.passwordHash);
    console.log("Password comparison result:", isValid);
    
    return isValid ? user : undefined;
  }

  // Patient management
  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0];
  }

  async getPatientByCivilId(civilId: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.civilId, civilId)).limit(1);
    return result[0];
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(patient).returning();
    return result[0];
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const updateData = { ...patient, updatedAt: new Date() };
    const result = await db.update(patients).set(updateData).where(eq(patients.id, id)).returning();
    return result[0];
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.isActive, true)).orderBy(patients.firstName, patients.lastName);
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    const searchPattern = `%${searchTerm}%`;
    return await db.select().from(patients).where(
      and(
        eq(patients.isActive, true),
        sql`(${patients.firstName} ILIKE ${searchPattern} OR ${patients.lastName} ILIKE ${searchPattern} OR ${patients.phone} ILIKE ${searchPattern} OR ${patients.civilId} ILIKE ${searchPattern})`
      )
    ).orderBy(patients.firstName, patients.lastName);
  }

  // Patient file management
  async getPatientFiles(patientId: string): Promise<PatientFile[]> {
    return await db.select().from(patientFiles).where(eq(patientFiles.patientId, patientId)).orderBy(desc(patientFiles.createdAt));
  }

  async createPatientFile(file: InsertPatientFile): Promise<PatientFile> {
    const result = await db.insert(patientFiles).values(file).returning();
    return result[0];
  }

  async deletePatientFile(id: string): Promise<boolean> {
    const result = await db.delete(patientFiles).where(eq(patientFiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPatientFile(id: string): Promise<PatientFile | undefined> {
    const result = await db.select().from(patientFiles).where(eq(patientFiles.id, id)).limit(1);
    return result[0];
  }

  // Service management
  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const updateData = { ...service, updatedAt: new Date() };
    const result = await db.update(services).set(updateData).where(eq(services.id, id)).returning();
    return result[0];
  }

  async deleteService(id: string): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(services.nameAr);
  }

  async getActiveServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true)).orderBy(services.nameAr);
  }

  // Appointment management
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const result = await db.insert(appointments).values(appointment).returning();
    return result[0];
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const updateData = { ...appointment, updatedAt: new Date() };
    const result = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning();
    return result[0];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByDate(date: Date): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      doctorId: appointments.doctorId,
      serviceName: services.nameAr,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      sql`${appointments.appointmentDate} >= ${startOfDay}`,
      sql`${appointments.appointmentDate} <= ${endOfDay}`
    ))
    .orderBy(appointments.appointmentDate);
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.doctorId, doctorId)).orderBy(desc(appointments.appointmentDate));
  }

  // Visit management
  async getVisit(id: string): Promise<Visit | undefined> {
    const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
    return result[0];
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const result = await db.insert(visits).values(visit).returning();
    return result[0];
  }

  async updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const updateData = { ...visit, updatedAt: new Date() };
    const result = await db.update(visits).set(updateData).where(eq(visits.id, id)).returning();
    return result[0];
  }

  async deleteVisit(id: string): Promise<boolean> {
    const result = await db.delete(visits).where(eq(visits.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getVisitsByPatient(patientId: string): Promise<Visit[]> {
    return await db.select({
      id: visits.id,
      appointmentId: visits.appointmentId,
      patientId: visits.patientId,
      doctorId: visits.doctorId,
      visitDate: visits.visitDate,
      chiefComplaint: visits.chiefComplaint,
      diagnosis: visits.diagnosis,
      proceduresJson: visits.proceduresJson,
      toothMapJson: visits.toothMapJson,
      doctorNotes: visits.doctorNotes,
      followUpDate: visits.followUpDate,
      status: visits.status,
      totalAmount: visits.totalAmount,
      createdAt: visits.createdAt,
      updatedAt: visits.updatedAt,
      doctorName: users.fullName
    })
    .from(visits)
    .leftJoin(users, eq(visits.doctorId, users.id))
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(visits.visitDate));
  }

  async getVisitsByDoctor(doctorId: string): Promise<Visit[]> {
    return await db.select({
      id: visits.id,
      appointmentId: visits.appointmentId,
      patientId: visits.patientId,
      doctorId: visits.doctorId,
      visitDate: visits.visitDate,
      chiefComplaint: visits.chiefComplaint,
      diagnosis: visits.diagnosis,
      proceduresJson: visits.proceduresJson,
      toothMapJson: visits.toothMapJson,
      doctorNotes: visits.doctorNotes,
      followUpDate: visits.followUpDate,
      status: visits.status,
      totalAmount: visits.totalAmount,
      createdAt: visits.createdAt,
      updatedAt: visits.updatedAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`
    })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .where(eq(visits.doctorId, doctorId))
    .orderBy(desc(visits.visitDate));
  }

  async getVisitWithDetails(id: string): Promise<any | undefined> {
    const result = await db.select({
      id: visits.id,
      appointmentId: visits.appointmentId,
      patientId: visits.patientId,
      doctorId: visits.doctorId,
      visitDate: visits.visitDate,
      chiefComplaint: visits.chiefComplaint,
      diagnosis: visits.diagnosis,
      proceduresJson: visits.proceduresJson,
      toothMapJson: visits.toothMapJson,
      doctorNotes: visits.doctorNotes,
      followUpDate: visits.followUpDate,
      status: visits.status,
      totalAmount: visits.totalAmount,
      createdAt: visits.createdAt,
      updatedAt: visits.updatedAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      patientPhone: patients.phone,
      patientCivilId: patients.civilId,
      doctorName: users.fullName
    })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .leftJoin(users, eq(visits.doctorId, users.id))
    .where(eq(visits.id, id))
    .limit(1);
    return result[0];
  }

  async getAllVisits(): Promise<Visit[]> {
    return await db.select({
      id: visits.id,
      appointmentId: visits.appointmentId,
      patientId: visits.patientId,
      doctorId: visits.doctorId,
      visitDate: visits.visitDate,
      chiefComplaint: visits.chiefComplaint,
      diagnosis: visits.diagnosis,
      proceduresJson: visits.proceduresJson,
      toothMapJson: visits.toothMapJson,
      doctorNotes: visits.doctorNotes,
      followUpDate: visits.followUpDate,
      status: visits.status,
      totalAmount: visits.totalAmount,
      createdAt: visits.createdAt,
      updatedAt: visits.updatedAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      doctorName: users.fullName
    })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .leftJoin(users, eq(visits.doctorId, users.id))
    .orderBy(desc(visits.visitDate));
  }

  // Invoice management
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0];
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1);
    return result[0];
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const updateData = { ...invoice, updatedAt: new Date() };
    const result = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByPatient(patientId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.patientId, patientId)).orderBy(desc(invoices.issueDate));
  }

  async getUnpaidInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).where(sql`${invoices.totalAmount} > ${invoices.paidAmount}`).orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.paymentStatus, status as any)).orderBy(desc(invoices.issueDate));
  }

  async getAllInvoicesWithDetails(): Promise<any[]> {
    return await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      patientId: invoices.patientId,
      visitId: invoices.visitId,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotalAmount: invoices.subtotal,
      discountAmount: invoices.discountAmount,
      taxAmount: invoices.taxAmount,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      status: invoices.paymentStatus,
      notes: invoices.notes,
      createdBy: invoices.createdBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      remainingAmount: sql<number>`${invoices.totalAmount} - ${invoices.paidAmount}`,
    })
    .from(invoices)
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .orderBy(desc(invoices.issueDate));
  }

  async createInvoiceWithItems(invoiceData: any, items: any[]): Promise<Invoice> {
    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create invoice
      const [invoice] = await tx.insert(invoices).values(invoiceData).returning();
      
      // Create invoice items
      for (const item of items) {
        await tx.insert(invoiceItems).values({
          ...item,
          invoiceId: invoice.id,
        });
      }
      
      return invoice;
    });
    
    return result;
  }

  async updateInvoicePaymentStatus(invoiceId: string, paymentAmount: number): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) return;

    const newPaidAmount = Number(invoice.paidAmount) + Number(paymentAmount);
    const totalAmount = Number(invoice.totalAmount);
    
    let newStatus: string;
    if (newPaidAmount >= totalAmount) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    } else {
      newStatus = "UNPAID";
    }

    await db.update(invoices)
      .set({ 
        paidAmount: newPaidAmount.toString(),
        paymentStatus: newStatus as any,
        updatedAt: new Date() 
      })
      .where(eq(invoices.id, invoiceId));
  }

  async getAppointmentWithDetails(id: string): Promise<any | undefined> {
    const result = await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      serviceId: appointments.serviceId,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      status: appointments.status,
      notes: appointments.notes,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      doctorName: users.fullName,
      serviceName: services.nameAr
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.id, id))
    .limit(1);
    return result[0];
  }

  async getPendingInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).where(sql`${invoices.totalAmount} > ${invoices.paidAmount}`).orderBy(desc(invoices.issueDate));
  }

  // Invoice Items management
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await db.insert(invoiceItems).values(item).returning();
    return result[0];
  }

  async updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const result = await db.update(invoiceItems).set(item).where(eq(invoiceItems.id, id)).returning();
    return result[0];
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Payment management
  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
    return result[0];
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.paymentDate));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.paymentDate));
  }

  async getAllPaymentsWithDetails(): Promise<any[]> {
    return await db.select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      method: payments.paymentMethod,
      transactionReference: payments.transactionId,
      notes: payments.notes,
      paidAt: payments.paymentDate,
      receivedBy: payments.receivedBy,
      createdAt: payments.createdAt,
      invoiceNumber: invoices.invoiceNumber,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      receivedByName: users.fullName
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(users, eq(payments.receivedBy, users.id))
    .orderBy(desc(payments.paymentDate));
  }

  async getPaymentsByDateRange(fromDate: Date, toDate: Date): Promise<any[]> {
    return await db.select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      method: payments.paymentMethod,
      transactionReference: payments.transactionId,
      notes: payments.notes,
      paidAt: payments.paymentDate,
      receivedBy: payments.receivedBy,
      createdAt: payments.createdAt,
      invoiceNumber: invoices.invoiceNumber,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      receivedByName: users.fullName
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .leftJoin(users, eq(payments.receivedBy, users.id))
    .where(and(
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .orderBy(desc(payments.paymentDate));
  }

  // Audit logging
  async createAuditLog(log: {
    userId?: string;
    action: string;
    tableName: string;
    recordId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(auditLogs).values(log);
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    monthlyRevenue: number;
    todayAppointments: number;
    pendingPayments: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalPatients,
      totalAppointments,
      totalRevenue,
      monthlyRevenue,
      todayAppointments,
      pendingPayments
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(patients).where(eq(patients.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(appointments),
      db.select({ sum: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)` }).from(invoices),
      db.select({ sum: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)` }).from(invoices)
        .where(sql`${invoices.issueDate} >= ${firstOfMonth}`),
      db.select({ count: sql<number>`count(*)` }).from(appointments)
        .where(and(
          sql`${appointments.appointmentDate} >= ${today}`,
          sql`${appointments.appointmentDate} < ${tomorrow}`
        )),
      db.select({ sum: sql<number>`coalesce(sum(${invoices.totalAmount} - ${invoices.paidAmount}), 0)` })
        .from(invoices).where(sql`${invoices.totalAmount} > ${invoices.paidAmount}`)
    ]);

    return {
      totalPatients: totalPatients[0].count,
      totalAppointments: totalAppointments[0].count,
      totalRevenue: Number(totalRevenue[0].sum),
      monthlyRevenue: Number(monthlyRevenue[0].sum),
      todayAppointments: todayAppointments[0].count,
      pendingPayments: Number(pendingPayments[0].sum)
    };
  }

  // Appointment slot management
  async getAvailableTimeSlots(date: Date, doctorId?: string, excludeAppointmentId?: string): Promise<string[]> {
    // Working hours: 09:00 - 21:00, slots every 30 minutes
    const startHour = 9;
    const endHour = 21;
    const slotDuration = 30; // minutes

    // Check if it's Friday (no appointments)
    if (date.getDay() === 5) {
      return [];
    }

    const slots: string[] = [];
    
    // Generate all possible slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeSlot);
      }
    }

    // Get existing appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const whereConditions = [
      sql`${appointments.appointmentDate} >= ${startOfDay}`,
      sql`${appointments.appointmentDate} <= ${endOfDay}`,
      sql`${appointments.status} != 'CANCELLED'`
    ];

    if (doctorId) {
      whereConditions.push(eq(appointments.doctorId, doctorId));
    }

    if (excludeAppointmentId) {
      whereConditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
    }

    const appointmentQuery = db.select().from(appointments)
      .where(and(...whereConditions));

    const existingAppointments = await appointmentQuery;

    // Filter out occupied slots
    const availableSlots = slots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTime = new Date(date);
      slotTime.setHours(hours, minutes, 0, 0);

      // Check if this slot conflicts with any existing appointment
      return !existingAppointments.some(apt => {
        const aptStart = new Date(apt.appointmentDate);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        const slotEnd = new Date(slotTime.getTime() + slotDuration * 60000);

        // Check for overlap
        return (slotTime < aptEnd && slotEnd > aptStart);
      });
    });

    return availableSlots;
  }

  async checkAppointmentConflict(appointmentDate: Date, duration: number, doctorId: string, excludeAppointmentId?: string): Promise<boolean> {
    const aptStart = new Date(appointmentDate);
    const aptEnd = new Date(aptStart.getTime() + duration * 60000);

    const conflictConditions = [
      eq(appointments.doctorId, doctorId),
      sql`${appointments.status} != 'CANCELLED'`,
      sql`${appointments.appointmentDate} < ${aptEnd}`,
      sql`${appointments.appointmentDate} + INTERVAL '1 minute' * ${appointments.duration} > ${aptStart}`
    ];

    if (excludeAppointmentId) {
      conflictConditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
    }

    const conflictQuery = db.select().from(appointments)
      .where(and(...conflictConditions));

    const conflicts = await conflictQuery;
    return conflicts.length > 0;
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return await db.select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      status: appointments.status,
      notes: appointments.notes,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        civilId: patients.civilId
      },
      doctor: {
        id: users.id,
        fullName: users.fullName,
        username: users.username
      },
      service: {
        id: services.id,
        nameAr: services.nameAr,
        nameEn: services.nameEn,
        price: services.price
      }
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      sql`${appointments.appointmentDate} >= ${startDate}`,
      sql`${appointments.appointmentDate} <= ${endDate}`
    ))
    .orderBy(appointments.appointmentDate);
  }

  async getWeeklyAppointments(startOfWeek: Date): Promise<any[]> {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      serviceId: appointments.serviceId,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      serviceName: sql<string>`COALESCE(${services.nameEn}, ${services.nameAr})`,
      doctorName: users.fullName
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(and(
      gte(appointments.appointmentDate, startOfWeek),
      lte(appointments.appointmentDate, endOfWeek)
    ))
    .orderBy(appointments.appointmentDate);
  }

  async getMonthlyAppointments(startOfMonth: Date, endOfMonth: Date): Promise<any[]> {
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      serviceId: appointments.serviceId,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      serviceName: sql<string>`COALESCE(${services.nameEn}, ${services.nameAr})`,
      doctorName: users.fullName
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(and(
      gte(appointments.appointmentDate, startOfMonth),
      lte(appointments.appointmentDate, endOfMonth)
    ))
    .orderBy(appointments.appointmentDate);
  }

  // Settings management
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0];
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    return await db.select().from(settings).where(eq(settings.category, category)).orderBy(settings.key);
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(settings.category, settings.key);
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const result = await db.insert(settings).values(setting).returning();
    return result[0];
  }

  async updateSetting(id: string, setting: Partial<InsertSetting>): Promise<Setting | undefined> {
    const updateData = { ...setting, updatedAt: new Date() };
    const result = await db.update(settings).set(updateData).where(eq(settings.id, id)).returning();
    return result[0];
  }

  async deleteSetting(id: string): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Clinic Info management
  async getClinicInfo(): Promise<ClinicInfo | undefined> {
    const result = await db.select().from(clinicInfo).limit(1);
    return result[0];
  }

  async createClinicInfo(info: InsertClinicInfo): Promise<ClinicInfo> {
    const result = await db.insert(clinicInfo).values(info).returning();
    return result[0];
  }

  async updateClinicInfo(id: string, info: Partial<InsertClinicInfo>): Promise<ClinicInfo | undefined> {
    const updateData = { ...info, updatedAt: new Date() };
    const result = await db.update(clinicInfo).set(updateData).where(eq(clinicInfo.id, id)).returning();
    return result[0];
  }

  // Reports and Analytics
  async getRevenueByMonth(): Promise<any[]> {
    return await db.select({
      month: sql<string>`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`,
      revenue: sql<number>`SUM(${invoices.totalAmount})`
    })
    .from(invoices)
    .where(sql`${invoices.issueDate} >= CURRENT_DATE - INTERVAL '12 months'`)
    .groupBy(sql`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`);
  }

  async getVisitsByService(): Promise<any[]> {
    return await db.select({
      serviceName: services.nameEn,
      serviceNameAr: services.nameAr,
      count: sql<number>`COUNT(*)`
    })
    .from(visits)
    .leftJoin(appointments, eq(visits.appointmentId, appointments.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(sql`${visits.visitDate} >= CURRENT_DATE - INTERVAL '6 months'`)
    .groupBy(services.id, services.nameEn, services.nameAr)
    .orderBy(sql`COUNT(*) DESC`);
  }

  async getNoShowStats(): Promise<any> {
    const totalAppointments = await db.select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(sql`${appointments.appointmentDate} >= CURRENT_DATE - INTERVAL '3 months'`);

    const noShows = await db.select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(and(
        eq(appointments.status, 'NO_SHOW'),
        sql`${appointments.appointmentDate} >= CURRENT_DATE - INTERVAL '3 months'`
      ));

    const total = totalAppointments[0].count;
    const noShowCount = noShows[0].count;
    
    return {
      totalAppointments: total,
      noShows: noShowCount,
      noShowRate: total > 0 ? (noShowCount / total * 100).toFixed(2) : '0.00'
    };
  }

  async getAgingReceivables(): Promise<any> {
    const buckets = {
      '0-30': sql<number>`SUM(CASE WHEN CURRENT_DATE - ${invoices.dueDate} BETWEEN 0 AND 30 THEN ${invoices.totalAmount} - ${invoices.paidAmount} ELSE 0 END)`,
      '31-60': sql<number>`SUM(CASE WHEN CURRENT_DATE - ${invoices.dueDate} BETWEEN 31 AND 60 THEN ${invoices.totalAmount} - ${invoices.paidAmount} ELSE 0 END)`,
      '61-90': sql<number>`SUM(CASE WHEN CURRENT_DATE - ${invoices.dueDate} BETWEEN 61 AND 90 THEN ${invoices.totalAmount} - ${invoices.paidAmount} ELSE 0 END)`,
      '90+': sql<number>`SUM(CASE WHEN CURRENT_DATE - ${invoices.dueDate} > 90 THEN ${invoices.totalAmount} - ${invoices.paidAmount} ELSE 0 END)`
    };

    const result = await db.select(buckets)
      .from(invoices)
      .where(sql`${invoices.totalAmount} > ${invoices.paidAmount} AND ${invoices.dueDate} IS NOT NULL`);

    return result[0] || { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  }

  // Service checks for referential integrity
  async isServiceReferenced(serviceId: string): Promise<boolean> {
    const appointmentCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(eq(appointments.serviceId, serviceId));

    const invoiceItemCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(invoiceItems)
      .where(eq(invoiceItems.serviceId, serviceId));

    return appointmentCount[0].count > 0 || invoiceItemCount[0].count > 0;
  }

}

export const storage = new PostgreSQLStorage();
