import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';
import { createApp } from './app';

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Prompt ERP API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
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
