import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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
} from "../shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await db.delete(payments);
    await db.delete(invoiceItems);
    await db.delete(invoices);
    await db.delete(visits);
    await db.delete(appointments);
    await db.delete(services);
    await db.delete(patients);
    await db.delete(users);

    // Create users
    console.log("👥 Creating users...");
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const doctorPassword = await bcrypt.hash("doctor123", 12);
    const receptionPassword = await bcrypt.hash("reception123", 12);
    const accountantPassword = await bcrypt.hash("accountant123", 12);

    const createdUsers = await db.insert(users).values([
      {
        username: "admin",
        password: hashedPassword,
        email: "admin@clinicos.com",
        fullName: "مدير النظام",
        role: "ADMIN",
        phone: "+96512345678",
        isActive: true,
      },
      {
        username: "doctor",
        password: doctorPassword,
        email: "doctor@clinicos.com",
        fullName: "د. أحمد محمد",
        role: "DOCTOR",
        phone: "+96512345679",
        isActive: true,
      },
      {
        username: "reception",
        password: receptionPassword,
        email: "reception@clinicos.com",
        fullName: "سارة أحمد",
        role: "RECEPTION",
        phone: "+96512345680",
        isActive: true,
      },
      {
        username: "accountant",
        password: accountantPassword,
        email: "accountant@clinicos.com",
        fullName: "محمد علي",
        role: "ACCOUNTANT",
        phone: "+96512345681",
        isActive: true,
      },
    ]).returning();

    const adminUser = createdUsers.find(u => u.username === "admin")!;
    const doctorUser = createdUsers.find(u => u.username === "doctor")!;

    // Create services
    console.log("🦷 Creating services...");
    const createdServices = await db.insert(services).values([
      {
        code: "EXAM001",
        nameAr: "فحص عام",
        nameEn: "General Checkup",
        descriptionAr: "فحص شامل للأسنان واللثة",
        descriptionEn: "Comprehensive dental and gum examination",
        price: "25.000",
        duration: 30,
        category: "examination",
        isActive: true,
      },
      {
        code: "CLEAN001",
        nameAr: "تنظيف الأسنان",
        nameEn: "Teeth Cleaning",
        descriptionAr: "تنظيف وتلميع الأسنان",
        descriptionEn: "Professional teeth cleaning and polishing",
        price: "40.000",
        duration: 45,
        category: "cleaning",
        isActive: true,
      },
      {
        code: "FILL001",
        nameAr: "حشو الأسنان",
        nameEn: "Dental Filling",
        descriptionAr: "حشو الأسنان المسوسة",
        descriptionEn: "Filling cavities in teeth",
        price: "50.000",
        duration: 60,
        category: "treatment",
        isActive: true,
      },
      {
        code: "EXTR001",
        nameAr: "قلع الأسنان",
        nameEn: "Tooth Extraction",
        descriptionAr: "قلع الأسنان التالفة",
        descriptionEn: "Removal of damaged teeth",
        price: "35.000",
        duration: 30,
        category: "surgery",
        isActive: true,
      },
      {
        code: "ORTH001",
        nameAr: "تقويم الأسنان",
        nameEn: "Orthodontics",
        descriptionAr: "تركيب وتعديل تقويم الأسنان",
        descriptionEn: "Braces installation and adjustment",
        price: "150.000",
        duration: 90,
        category: "orthodontics",
        isActive: true,
      },
    ]).returning();

    // Create patients
    console.log("🏥 Creating patients...");
    const createdPatients = await db.insert(patients).values([
      {
        civilId: "123456789012",
        firstName: "أحمد",
        lastName: "الكندري",
        phone: "+96512345682",
        email: "ahmed.alkandari@email.com",
        dateOfBirth: new Date("1985-05-15"),
        gender: "MALE",
        address: "الكويت، حولي، شارع التجار",
        emergencyContact: "فاطمة الكندري",
        emergencyPhone: "+96512345683",
        allergies: ["البنسلين", "الأسبرين"],
        medicalHistory: "لا يوجد تاريخ مرضي مهم",
        notes: "مريض منتظم، يراجع كل 6 أشهر",
        isActive: true,
      },
      {
        civilId: "234567890123",
        firstName: "فاطمة",
        lastName: "العتيبي",
        phone: "+96512345684",
        email: "fatima.alotaibi@email.com",
        dateOfBirth: new Date("1990-08-22"),
        gender: "FEMALE",
        address: "الكويت، السالمية، شارع الخليج",
        emergencyContact: "محمد العتيبي",
        emergencyPhone: "+96512345685",
        allergies: ["اللاكتوز"],
        medicalHistory: "حساسية من بعض المضادات الحيوية",
        notes: "تحتاج لمتابعة دورية لتقويم الأسنان",
        isActive: true,
      },
      {
        civilId: "345678901234",
        firstName: "محمد",
        lastName: "الشمري",
        phone: "+96512345686",
        email: "mohammed.alshammari@email.com",
        dateOfBirth: new Date("1978-12-10"),
        gender: "MALE",
        address: "الكويت، الفروانية، شارع الرقعي",
        emergencyContact: "نورا الشمري",
        emergencyPhone: "+96512345687",
        allergies: [],
        medicalHistory: "ضغط دم مرتفع",
        notes: "يحتاج لتخدير خاص",
        isActive: true,
      },
      {
        civilId: "456789012345",
        firstName: "نورا",
        lastName: "المطيري",
        phone: "+96512345688",
        email: "nora.almutairi@email.com",
        dateOfBirth: new Date("1995-03-18"),
        gender: "FEMALE",
        address: "الكويت، الجهراء، شارع الصناعة",
        emergencyContact: "علي المطيري",
        emergencyPhone: "+96512345689",
        allergies: ["المكسرات"],
        medicalHistory: "لا يوجد",
        notes: "مريضة جديدة",
        isActive: true,
      },
    ]).returning();

    // Create appointments
    console.log("📅 Creating appointments...");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const createdAppointments = await db.insert(appointments).values([
      {
        patientId: createdPatients[0].id,
        doctorId: doctorUser.id,
        serviceId: createdServices[0].id,
        appointmentDate: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        duration: 30,
        status: "SCHEDULED",
        notes: "فحص دوري",
        createdBy: adminUser.id,
      },
      {
        patientId: createdPatients[1].id,
        doctorId: doctorUser.id,
        serviceId: createdServices[1].id,
        appointmentDate: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000), // Tomorrow 10 AM
        duration: 45,
        status: "SCHEDULED",
        notes: "تنظيف دوري",
        createdBy: adminUser.id,
      },
      {
        patientId: createdPatients[2].id,
        doctorId: doctorUser.id,
        serviceId: createdServices[2].id,
        appointmentDate: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000), // Tomorrow 2 PM
        duration: 60,
        status: "CONFIRMED",
        notes: "حشو السن العلوي الأيمن",
        createdBy: adminUser.id,
      },
    ]).returning();

    // Create visits (for completed appointments)
    console.log("🏥 Creating visits...");
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const createdVisits = await db.insert(visits).values([
      {
        appointmentId: null, // Walk-in visit
        patientId: createdPatients[0].id,
        doctorId: doctorUser.id,
        visitDate: yesterday,
        chiefComplaint: "ألم في الضرس الخلفي",
        diagnosis: "تسوس في الضرس السفلي الأيسر",
        treatment: "حشو مؤقت وصف مسكن للألم",
        prescriptions: [
          {
            medication: "ايبوبروفين 400mg",
            dosage: "حبة كل 8 ساعات",
            duration: "3 أيام",
            instructions: "مع الطعام"
          }
        ],
        procedures: ["فحص سريري", "أشعة"],
        teethChart: {
          "tooth-36": {
            condition: "decayed",
            treatment: "temporary_filling",
            notes: "يحتاج حشو دائم"
          }
        },
        notes: "المريض يحتاج لزيارة متابعة خلال أسبوع",
        followUpDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
        totalAmount: "50.000",
      },
    ]).returning();

    // Create invoices
    console.log("💰 Creating invoices...");
    const createdInvoices = await db.insert(invoices).values([
      {
        invoiceNumber: "INV-2024-001",
        patientId: createdPatients[0].id,
        visitId: createdVisits[0].id,
        issueDate: yesterday,
        dueDate: new Date(yesterday.getTime() + 30 * 24 * 60 * 60 * 1000),
        subtotal: "50.000",
        taxAmount: "0.000",
        discountAmount: "0.000",
        totalAmount: "50.000",
        paidAmount: "50.000",
        paymentStatus: "PAID",
        notes: "دفع نقدي",
        createdBy: adminUser.id,
      },
      {
        invoiceNumber: "INV-2024-002",
        patientId: createdPatients[1].id,
        visitId: null,
        issueDate: today,
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        subtotal: "40.000",
        taxAmount: "0.000",
        discountAmount: "5.000",
        totalAmount: "35.000",
        paidAmount: "0.000",
        paymentStatus: "PENDING",
        notes: "خصم 5 دنانير للمراجعة الدورية",
        createdBy: adminUser.id,
      },
    ]).returning();

    // Create invoice items
    console.log("📋 Creating invoice items...");
    await db.insert(invoiceItems).values([
      {
        invoiceId: createdInvoices[0].id,
        serviceId: createdServices[2].id,
        description: "حشو مؤقت للضرس السفلي الأيسر",
        quantity: 1,
        unitPrice: "50.000",
        totalPrice: "50.000",
      },
      {
        invoiceId: createdInvoices[1].id,
        serviceId: createdServices[1].id,
        description: "تنظيف وتلميع الأسنان",
        quantity: 1,
        unitPrice: "40.000",
        totalPrice: "40.000",
      },
    ]);

    // Create payments
    console.log("💳 Creating payments...");
    await db.insert(payments).values([
      {
        invoiceId: createdInvoices[0].id,
        amount: "50.000",
        paymentMethod: "CASH",
        transactionId: null,
        paymentDate: yesterday,
        notes: "دفع نقدي كامل",
        receivedBy: adminUser.id,
      },
    ]);

    console.log("✅ Database seeded successfully!");
    console.log("🔑 Login credentials:");
    console.log("  Admin: admin / admin123");
    console.log("  Doctor: doctor / doctor123");
    console.log("  Reception: reception / reception123");
    console.log("  Accountant: accountant / accountant123");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log("🎉 Seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed failed:", error);
      process.exit(1);
    });
}

export { seed };