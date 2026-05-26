import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, errors, splat, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const m = stack ?? message;
  const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${m}${extras}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), splat(), timestamp()),
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), consoleFormat),
    }),
  ],
});
