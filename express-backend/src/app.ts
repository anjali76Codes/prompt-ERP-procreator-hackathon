import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import routes from './routes';
import { requestLogger } from './middlewares/request-logger.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const createApp = (): express.Express => {
  const app = express();

  app.use(helmet());
  // Support a comma-separated list in CORS_ORIGIN (or '*' for all).
  const rawOrigins = env.CORS_ORIGIN || '';
  const allowedOrigins = rawOrigins.trim() === '*'
    ? ['*']
    : rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g., server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
