export function logDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('📊 DATABASE_URL:', dbUrl.includes('file:') ? dbUrl : '[REDACTED]');
  } else {
    console.log('⚠️ DATABASE_URL not set, using default');
  }
}