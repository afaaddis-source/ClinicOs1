import bcryptjs from 'bcryptjs';
import { db } from './lib/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

export async function bootstrapAdmin() {
  try {
    // Check if any admin user exists
    const adminExists = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);

    if (adminExists.length > 0) {
      console.log('ℹ️ Admin user already exists, skipping bootstrap');
      return;
    }

    const bootstrapUsername = process.env.BOOTSTRAP_ADMIN_USER || 'admin';
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';

    console.log(`ℹ️ Creating admin user: ${bootstrapUsername}`);

    const hashedPassword = await bcryptjs.hash(bootstrapPassword, 12);

    const [adminUser] = await db.insert(users).values({
      username: bootstrapUsername,
      passwordHash: hashedPassword,
      role: 'ADMIN',
      fullName: 'System Administrator',
      email: 'admin@clinicos.local'
    }).returning();

    console.log(`✅ Bootstrap admin created: ${adminUser.username}`);
  } catch (error) {
    console.error('❌ Error bootstrapping admin:', error);
  }
}