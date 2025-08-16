import bcryptjs from 'bcryptjs';
import { HARDCODED_USERS } from './hardcoded-users';
import type {
  User, InsertUser, Patient, InsertPatient, Service, InsertService,
  Appointment, InsertAppointment, Visit, InsertVisit, Invoice, InsertInvoice,
  InvoiceItem, InsertInvoiceItem, Payment, InsertPayment, PatientFile, InsertPatientFile,
  AuditLog, Setting, InsertSetting, ClinicInfo, InsertClinicInfo
} from "@shared/schema";

// In-memory storage for deployment without database
export class MemoryStorage {
  private users: User[] = [...HARDCODED_USERS] as User[];
  private patients: Patient[] = [];
  private services: Service[] = [];
  private appointments: Appointment[] = [];
  private visits: Visit[] = [];
  private invoices: Invoice[] = [];
  private invoiceItems: InvoiceItem[] = [];
  private payments: Payment[] = [];
  private patientFiles: PatientFile[] = [];
  private auditLogs: AuditLog[] = [];
  private settings: Setting[] = [];
  private clinicInfo: ClinicInfo[] = [];

  // User management
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcryptjs.hash(user.password, 12);
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      passwordHash: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    delete (newUser as any).password;
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;

    const updateData: any = { ...user };
    if (updateData.password) {
      updateData.passwordHash = await bcryptjs.hash(updateData.password, 12);
      delete updateData.password;
    }
    updateData.updatedAt = new Date();

    this.users[index] = { ...this.users[index], ...updateData };
    return this.users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) {
      return undefined;
    }

    const isValid = await bcryptjs.compare(password, user.passwordHash);
    return isValid ? user : undefined;
  }

  // Basic stubs for other methods - return empty arrays/false for read operations
  async getPatient(id: string): Promise<Patient | undefined> { return undefined; }
  async getPatientByCivilId(civilId: string): Promise<Patient | undefined> { return undefined; }
  async createPatient(patient: InsertPatient): Promise<Patient> { 
    const newPatient = { ...patient, id: `patient-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Patient;
    this.patients.push(newPatient);
    return newPatient;
  }
  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> { return undefined; }
  async deletePatient(id: string): Promise<boolean> { return false; }
  async getAllPatients(): Promise<Patient[]> { return [...this.patients]; }
  async searchPatients(searchTerm: string): Promise<Patient[]> { return []; }

  async getPatientFiles(patientId: string): Promise<PatientFile[]> { return []; }
  async createPatientFile(file: InsertPatientFile): Promise<PatientFile> { 
    const newFile = { ...file, id: `file-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as PatientFile;
    this.patientFiles.push(newFile);
    return newFile;
  }
  async deletePatientFile(id: string): Promise<boolean> { return false; }
  async getPatientFile(id: string): Promise<PatientFile | undefined> { return undefined; }

  async getService(id: string): Promise<Service | undefined> { return undefined; }
  async createService(service: InsertService): Promise<Service> { 
    const newService = { ...service, id: `service-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Service;
    this.services.push(newService);
    return newService;
  }
  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> { return undefined; }
  async deleteService(id: string): Promise<boolean> { return false; }
  async getAllServices(): Promise<Service[]> { return [...this.services]; }
  async getActiveServices(): Promise<Service[]> { return this.services.filter(s => s.isActive); }

  async getAppointment(id: string): Promise<Appointment | undefined> { return undefined; }
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> { 
    const newAppointment = { ...appointment, id: `appointment-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Appointment;
    this.appointments.push(newAppointment);
    return newAppointment;
  }
  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> { return undefined; }
  async deleteAppointment(id: string): Promise<boolean> { return false; }
  async getAllAppointments(): Promise<Appointment[]> { return [...this.appointments]; }
  async getAppointmentsByDate(date: Date): Promise<Appointment[]> { return []; }
  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> { return []; }
  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> { return []; }

  async getVisit(id: string): Promise<Visit | undefined> { return undefined; }
  async createVisit(visit: InsertVisit): Promise<Visit> { 
    const newVisit = { ...visit, id: `visit-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Visit;
    this.visits.push(newVisit);
    return newVisit;
  }
  async updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined> { return undefined; }
  async deleteVisit(id: string): Promise<boolean> { return false; }
  async getAllVisits(): Promise<Visit[]> { return [...this.visits]; }
  async getVisitsByPatient(patientId: string): Promise<Visit[]> { return []; }
  async getVisitsByDoctor(doctorId: string): Promise<Visit[]> { return []; }

  async getInvoice(id: string): Promise<Invoice | undefined> { return undefined; }
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> { return undefined; }
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> { 
    const newInvoice = { ...invoice, id: `invoice-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Invoice;
    this.invoices.push(newInvoice);
    return newInvoice;
  }
  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> { return undefined; }
  async deleteInvoice(id: string): Promise<boolean> { return false; }
  async getAllInvoices(): Promise<Invoice[]> { return [...this.invoices]; }
  async getInvoicesByPatient(patientId: string): Promise<Invoice[]> { return []; }
  async getUnpaidInvoices(): Promise<Invoice[]> { return []; }
  async getPendingInvoices(): Promise<Invoice[]> { return []; }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> { return []; }
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> { 
    const newItem = { ...item, id: `item-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as InvoiceItem;
    this.invoiceItems.push(newItem);
    return newItem;
  }
  async updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> { return undefined; }
  async deleteInvoiceItem(id: string): Promise<boolean> { return false; }

  async getPayment(id: string): Promise<Payment | undefined> { return undefined; }
  async createPayment(payment: InsertPayment): Promise<Payment> { 
    const newPayment = { ...payment, id: `payment-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Payment;
    this.payments.push(newPayment);
    return newPayment;
  }
  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> { return undefined; }
  async deletePayment(id: string): Promise<boolean> { return false; }
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> { return []; }
  async getAllPayments(): Promise<Payment[]> { return [...this.payments]; }

  async createAuditLog(log: any): Promise<void> {
    const auditLog = { ...log, id: `audit-${Date.now()}`, createdAt: new Date() } as AuditLog;
    this.auditLogs.push(auditLog);
  }

  async getAuditLogs(): Promise<AuditLog[]> { return [...this.auditLogs]; }

  async getSetting(key: string): Promise<Setting | undefined> { 
    return this.settings.find(s => s.key === key);
  }
  async setSetting(key: string, value: string): Promise<Setting> { 
    const existing = await this.getSetting(key);
    if (existing) {
      existing.value = value;
      existing.updatedAt = new Date();
      return existing;
    }
    const newSetting = { id: `setting-${Date.now()}`, key, value, createdAt: new Date(), updatedAt: new Date() } as Setting;
    this.settings.push(newSetting);
    return newSetting;
  }
  async getAllSettings(): Promise<Setting[]> { return [...this.settings]; }

  async getClinicInfo(): Promise<ClinicInfo | undefined> { 
    return this.clinicInfo[0];
  }
  async updateClinicInfo(info: Partial<InsertClinicInfo>): Promise<ClinicInfo> { 
    if (this.clinicInfo.length === 0) {
      const newInfo = { ...info, id: `clinic-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as ClinicInfo;
      this.clinicInfo.push(newInfo);
      return newInfo;
    }
    this.clinicInfo[0] = { ...this.clinicInfo[0], ...info, updatedAt: new Date() };
    return this.clinicInfo[0];
  }
}