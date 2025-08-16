import { db } from '../src/lib/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

async function fixPasswords() {
  console.log('🔧 Fixing user passwords to match login page...');
  
  const userUpdates = [
    { username: 'admin', password: '123456' },
    { username: 'reception', password: '123456' },
    { username: 'doctor', password: '123456' },
    { username: 'accountant', password: '123456' }
  ];

  for (const update of userUpdates) {
    try {
      const hashedPassword = await bcryptjs.hash(update.password, 12);
      
      await db.update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.username, update.username));
      
      console.log(`✅ Updated password for: ${update.username}`);
    } catch (error) {
      console.error(`❌ Failed to update ${update.username}:`, error);
    }
  }
}

fixPasswords().then(() => {
  console.log('🎉 Password update completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error updating passwords:', error);
  process.exit(1);
});
