import { z } from 'zod';
import { Role, Gender, AppointmentStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';

export const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const patientSchema = z.object({
  civilId: z.string().min(1, 'الرقم المدني مطلوب'),
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  dob: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  allergies: z.string().optional(),
});

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'المريض مطلوب'),
  serviceId: z.string().min(1, 'الخدمة مطلوبة'),
  doctorId: z.string().min(1, 'الطبيب مطلوب'),
  start: z.string().min(1, 'وقت البداية مطلوب'),
  notes: z.string().optional(),
});

export const visitSchema = z.object({
  patientId: z.string().min(1, 'المريض مطلوب'),
  doctorId: z.string().min(1, 'الطبيب مطلوب'),
  appointmentId: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

export const serviceSchema = z.object({
  code: z.string().min(1, 'كود الخدمة مطلوب'),
  nameAr: z.string().min(1, 'الاسم العربي مطلوب'),
  nameEn: z.string().min(1, 'الاسم الإنجليزي مطلوب'),
  price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  defaultMinutes: z.number().positive('المدة يجب أن تكون أكبر من صفر'),
});

export const invoiceSchema = z.object({
  patientId: z.string().min(1, 'المريض مطلوب'),
  items: z.array(z.object({
    serviceId: z.string().min(1, 'الخدمة مطلوبة'),
    qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
    price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  })).min(1, 'عنصر واحد على الأقل مطلوب'),
  discount: z.number().min(0, 'الخصم لا يمكن أن يكون سالب').optional(),
  tax: z.number().min(0, 'الضريبة لا يمكن أن تكون سالبة').optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'الفاتورة مطلوبة'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  method: z.nativeEnum(PaymentMethod),
  txnRef: z.string().optional(),
});

export const userSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  role: z.nativeEnum(Role),
});
