import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User } from '../models/User';
import { hashPassword } from '../services/auth.service';
import { logger } from '../utils/logger';

const run = async () => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed an admin');
    process.exit(1);
  }

  await connectDatabase();

  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    logger.info(`Admin already exists: ${env.ADMIN_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    const admin = await User.create({
      email: env.ADMIN_EMAIL,
      passwordHash,
      name: env.ADMIN_NAME ?? 'Admin Console',
      role: 'admin',
      status: 'active',
    });
    logger.info(`Admin created: ${admin.email}`);
  }

  await disconnectDatabase();
  process.exit(0);
};

run().catch((err) => {
  logger.error('seed-admin failed', err as Error);
  process.exit(1);
});
