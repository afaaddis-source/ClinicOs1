import { PrismaClient, Role, Gender, AppointmentStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Check if users already exist
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('👥 Users already exist, skipping seed');
    return;
  }

  // Create users
  const adminPassword = await bcryptjs.hash('123456', 12);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const receptionPassword = await bcryptjs.hash('123456', 12);
  const reception = await prisma.user.create({
    data: {
      username: 'reception',
      passwordHash: receptionPassword,
      role: Role.RECEPTION,
    },
  });

  const doctorPassword = await bcryptjs.hash('123456', 12);
  const doctor = await prisma.user.create({
    data: {
      username: 'doctor',
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
    },
  });

  const accountantPassword = await bcryptjs.hash('123456', 12);
  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      passwordHash: accountantPassword,
      role: Role.ACCOUNTANT,
    },
  });

  console.log('✅ Users created');

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        code: 'SCALING',
        nameAr: 'تنظيف الأسنان',
        nameEn: 'Teeth Scaling',
        price: 15,
        defaultMinutes: 30,
      },
    }),
    prisma.service.create({
      data: {
        code: 'WHITENING',
        nameAr: 'تبييض الأسنان',
        nameEn: 'Teeth Whitening',
        price: 150,
        defaultMinutes: 60,
      },
    }),
    prisma.service.create({
      data: {
        code: 'ROOT_CANAL',
        nameAr: 'علاج جذور الأسنان',
        nameEn: 'Root Canal Treatment',
        price: 90,
        defaultMinutes: 90,
      },
    }),
  ]);

  console.log('✅ Services created');

  // Create demo patient
  const patient = await prisma.patient.create({
    data: {
      civilId: '123456789',
      name: 'أحمد محمد الرشيد',
      phone: '+965 9999 8888',
      dob: new Date('1985-06-15'),
      gender: Gender.MALE,
      allergies: 'حساسية من البنسلين',
    },
  });

  console.log('✅ Demo patient created');

  // Create demo appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const appointmentEnd = new Date(tomorrow);
  appointmentEnd.setMinutes(appointmentEnd.getMinutes() + services[0].defaultMinutes);

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: services[0].id,
      doctorId: doctor.id,
      start: tomorrow,
      end: appointmentEnd,
      status: AppointmentStatus.SCHEDULED,
      notes: 'مراجعة دورية',
    },
  });

  console.log('✅ Demo appointment created');

  console.log('🎉 Seed completed successfully!');
  console.log('📋 Login credentials:');
  console.log('  Admin: admin / 123456');
  console.log('  Reception: reception / 123456');
  console.log('  Doctor: doctor / 123456');
  console.log('  Accountant: accountant / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
