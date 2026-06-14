import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'STAFF';
    name: string;
  };
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    const secret = process.env.JWT_SECRET || 'local-development-secret-key-1234567890';

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }

      req.user = user as AuthRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
}

export function requireRole(roles: ('ADMIN' | 'STAFF')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}
