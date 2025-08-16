import bcryptjs from 'bcryptjs';

// Hardcoded test users for deployment without database dependency
export const HARDCODED_USERS = [
  {
    id: 'hardcoded-admin-001',
    username: 'admin',
    passwordHash: '$2b$12$.Q3b0dLovUFxe.GIjhFI4.1pOa3HqyXtFd90p/38x9ghol72PQNYq', // 123456
    fullName: 'System Administrator',
    role: 'ADMIN',
    email: 'admin@clinicos.local',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hardcoded-reception-001',
    username: 'reception',
    passwordHash: '$2b$12$.Q3b0dLovUFxe.GIjhFI4.1pOa3HqyXtFd90p/38x9ghol72PQNYq', // 123456
    fullName: 'Reception Staff',
    role: 'RECEPTION',
    email: 'reception@clinicos.local',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hardcoded-doctor-001',
    username: 'doctor',
    passwordHash: '$2b$12$.Q3b0dLovUFxe.GIjhFI4.1pOa3HqyXtFd90p/38x9ghol72PQNYq', // 123456
    fullName: 'Dr. Ahmed Al-Mansouri',
    role: 'DOCTOR',
    email: 'doctor@clinicos.local',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hardcoded-accountant-001',
    username: 'accountant',
    passwordHash: '$2b$12$.Q3b0dLovUFxe.GIjhFI4.1pOa3HqyXtFd90p/38x9ghol72PQNYq', // 123456
    fullName: 'Accountant Staff',
    role: 'ACCOUNTANT',
    email: 'accountant@clinicos.local',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Function to find user by username
export function findHardcodedUser(username: string) {
  return HARDCODED_USERS.find(user => user.username === username);
}

// Function to authenticate hardcoded user
export async function authenticateHardcodedUser(username: string, password: string) {
  const user = findHardcodedUser(username);
  if (!user || !user.isActive) {
    return undefined;
  }
  
  const isValid = await bcryptjs.compare(password, user.passwordHash);
  return isValid ? user : undefined;
}

// Generate password hash for new hardcoded users
export async function generatePasswordHash(password: string) {
  return await bcryptjs.hash(password, 12);
}

// Environment variable to enable hardcoded users mode
export const USE_HARDCODED_USERS = process.env.USE_HARDCODED_USERS === 'true' || process.env.NODE_ENV === 'production';

console.log('🔒 Hardcoded users mode:', USE_HARDCODED_USERS ? 'ENABLED' : 'DISABLED');