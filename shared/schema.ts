import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  decimal, 
  integer, 
  boolean,
  jsonb,
  pgEnum 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "DOCTOR", "RECEPTION", "ACCOUNTANT"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const visitStatusEnum = pgEnum("visit_status", ["IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "PAID", "PARTIAL", "REFUNDED"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("RECEPTION"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  civilId: text("civil_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: genderEnum("gender"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  allergies: text("allergies").array(),
  medicalHistory: text("medical_history"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  doctorId: varchar("doctor_id").notNull().references(() => users.id),
  serviceId: varchar("service_id").references(() => services.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").notNull().default(30), // in minutes
  status: appointmentStatusEnum("status").notNull().default("SCHEDULED"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Visits table
export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  doctorId: varchar("doctor_id").notNull().references(() => users.id),
  visitDate: timestamp("visit_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  chiefComplaint: text("chief_complaint"),
  diagnosis: text("diagnosis"),
  proceduresJson: jsonb("procedures_json"), // Array of procedure objects with serviceId, tooth, surfaces, notes
  toothMapJson: jsonb("tooth_map_json"), // Simple JSON of selected teeth
  doctorNotes: text("doctor_notes"),
  followUpDate: timestamp("follow_up_date"),
  status: visitStatusEnum("status").notNull().default("IN_PROGRESS"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  visitId: varchar("visit_id").references(() => visits.id),
  issueDate: timestamp("issue_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Invoice Items table
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  serviceId: varchar("service_id").references(() => services.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // CASH, CARD, BANK_TRANSFER, etc.
  transactionId: text("transaction_id"),
  paymentDate: timestamp("payment_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
  receivedBy: varchar("received_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Patient Files table
export const patientFiles = pgTable("patient_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // "image" or "document"
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  appointmentsAsDoctor: many(appointments, { relationName: "doctorAppointments" }),
  appointmentsCreated: many(appointments, { relationName: "createdAppointments" }),
  visitsAsDoctor: many(visits),
  invoicesCreated: many(invoices),
  paymentsReceived: many(payments),
  auditLogs: many(auditLogs)
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  visits: many(visits),
  invoices: many(invoices),
  files: many(patientFiles)
}));

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
  invoiceItems: many(invoiceItems)
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id]
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
    relationName: "doctorAppointments"
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id]
  }),
  createdBy: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
    relationName: "createdAppointments"
  }),
  visits: many(visits)
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [visits.appointmentId],
    references: [appointments.id]
  }),
  patient: one(patients, {
    fields: [visits.patientId],
    references: [patients.id]
  }),
  doctor: one(users, {
    fields: [visits.doctorId],
    references: [users.id]
  }),
  invoices: many(invoices)
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id]
  }),
  visit: one(visits, {
    fields: [invoices.visitId],
    references: [visits.id]
  }),
  createdBy: one(users, {
    fields: [invoices.createdBy],
    references: [users.id]
  }),
  items: many(invoiceItems),
  payments: many(payments)
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id]
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id]
  }),
  receivedBy: one(users, {
    fields: [payments.receivedBy],
    references: [users.id]
  })
}));

export const patientFilesRelations = relations(patientFiles, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFiles.patientId],
    references: [patients.id]
  }),
  uploadedBy: one(users, {
    fields: [patientFiles.uploadedBy],
    references: [users.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  civilId: z.string().min(12).max(12).regex(/^\d{12}$/, "Civil ID must be exactly 12 digits"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(8, "Phone number is required"),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});

export const insertPatientFileSchema = createInsertSchema(patientFiles).omit({
  id: true,
  createdAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type PatientFile = typeof patientFiles.$inferSelect;
export type InsertPatientFile = z.infer<typeof insertPatientFileSchema>;

// Visit-specific types
export interface VisitProcedure {
  serviceId: string;
  tooth?: string; // tooth number (1-32)
  surfaces?: string[]; // tooth surfaces like "mesial", "distal", "occlusal"
  notes?: string;
}

export interface ToothData {
  condition?: string; // "healthy", "decayed", "filled", "missing", "crowned"
  treatment?: string; // treatment applied
  notes?: string;
}

export type AuditLog = typeof auditLogs.$inferSelect;
