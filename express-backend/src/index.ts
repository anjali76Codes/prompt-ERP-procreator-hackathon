import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';
import { createApp } from './app';

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Prompt ERP API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    // Version stamp so you can see in the terminal which build the server
    // is actually running. If you don't see this line after restarting,
    // ts-node-dev hasn't picked up the source changes yet.
    logger.info('   build: 2026-05-29 — /me/student-overview + /notifications are auth-only; GET requests bypass active-status gate');
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));
  process.on('uncaughtException', (err) => logger.error('Uncaught exception', err));
};

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap server', err as Error);
  process.exit(1);
});
