import { Request, Response, NextFunction } from 'express';
import { resolveUserId } from '../services/session.cache';

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
  airtableToken: string;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { userId, email } = await resolveUserId(token);
    (req as AuthRequest).userId = userId;
    (req as AuthRequest).userEmail = email;
    (req as AuthRequest).airtableToken = token;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
