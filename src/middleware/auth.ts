import type { NextFunction, Request, Response } from 'express';
import { getOrCreateUser } from '../db/repository.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'customer';
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Empty authentication token.' });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser({
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: typeof decoded.name === 'string' ? decoded.name : null,
    });

    req.authUser = {
      uid: dbUser.uid,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role === 'admin' ? 'admin' : 'customer',
    };
    next();
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const decoded = await adminAuth.verifyIdToken(token);
        const dbUser = await getOrCreateUser({
          uid: decoded.uid,
          email: decoded.email ?? '',
          displayName: typeof decoded.name === 'string' ? decoded.name : null,
        });
        req.authUser = {
          uid: dbUser.uid,
          email: dbUser.email,
          displayName: dbUser.displayName,
          role: dbUser.role === 'admin' ? 'admin' : 'customer',
        };
      }
    }
  } catch {
    // Ignore optional auth errors on public routes
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized: Sign in required.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden: Company administrator permissions are required for this action.',
    });
    return;
  }
  next();
}
