import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedPrincipal;
    }
  }
}

export {};
