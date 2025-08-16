import { db } from '../src/lib/db';
import { users } from '../shared/schema';
import bcryptjs from 'bcryptjs';

async function seedUsers() {
  console.log('🌱 Seeding default users...');
  
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'ADMIN' as const,
      email: 'admin@clinicos.local'
    },
    {
      username: 'reception',
      password: 'reception123',
      fullName: 'Reception Staff',
      role: 'RECEPTION' as const,
      email: 'reception@clinicos.local'
    },
    {
      username: 'doctor',
      password: 'doctor123',
      fullName: 'Dr. Ahmed Al-Mansouri',
      role: 'DOCTOR' as const,
      email: 'doctor@clinicos.local'
    },
    {
      username: 'accountant',
      password: 'accountant123',
      fullName: 'Accountant Staff',
      role: 'ACCOUNTANT' as const,
      email: 'accountant@clinicos.local'
    }
  ];

  for (const user of defaultUsers) {
    try {
      const hashedPassword = await bcryptjs.hash(user.password, 12);
      
      await db.insert(users).values({
        username: user.username,
        passwordHash: hashedPassword,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        isActive: true
      }).onConflictDoNothing();
      
      console.log(`✅ Created user: ${user.username} (${user.role})`);
    } catch (error) {
      console.log(`ℹ️ User ${user.username} already exists`);
    }
  }
}

seedUsers().then(() => {
  console.log('🎉 User seeding completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error seeding users:', error);
  process.exit(1);
});
