import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, like, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
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
} from "@shared/schema";

const sql_connection = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_connection);

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
    const hashedPassword = await bcrypt.hash(user.password, 12);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...user };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }
    updateData.updatedAt = new Date();
    
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
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
      return undefined;
    }
    
    const isValid = await bcrypt.compare(password, user.password);
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
  }

  async getAllVisits(): Promise<Visit[]> {
    return await db.select().from(visits).orderBy(desc(visits.visitDate));
  }

  async getVisitsByPatient(patientId: string): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.patientId, patientId)).orderBy(desc(visits.visitDate));
  }

  async getVisitsByDoctor(doctorId: string): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.doctorId, doctorId)).orderBy(desc(visits.visitDate));
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.paymentDate));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.paymentDate));
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


}

export const storage = new PostgreSQLStorage();
