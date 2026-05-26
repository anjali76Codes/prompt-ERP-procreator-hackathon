import type { JwtPayload } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export {};
