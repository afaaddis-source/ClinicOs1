import { PrismaClient, Role } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export async function bootstrapAdmin() {
  try {
    // Check if any admin user exists
    const adminExists = await prisma.user.findFirst({
      where: { role: Role.ADMIN }
    });

    if (adminExists) {
      console.log('ℹ️ Admin user already exists, skipping bootstrap');
      return;
    }

    const bootstrapUsername = process.env.BOOTSTRAP_ADMIN_USER || 'admin';
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!bootstrapPassword) {
      console.warn('⚠️ BOOTSTRAP_ADMIN_PASSWORD not set, skipping admin creation');
      return;
    }

    const hashedPassword = await bcryptjs.hash(bootstrapPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        username: bootstrapUsername,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
      },
    });

    console.log(`✅ Bootstrap admin created: ${adminUser.username}`);
  } catch (error) {
    console.error('❌ Error bootstrapping admin:', error);
  }
}