import { execSync } from 'node:child_process';
export async function setup() { if (process.env.DATABASE_URL) execSync('npx prisma migrate deploy', { stdio: 'inherit' }); }
