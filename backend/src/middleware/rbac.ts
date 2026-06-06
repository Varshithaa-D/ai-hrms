import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role)) {
      res.status(403).json({ message: `Role '${req.user?.role}' not allowed` }); return;
    }
    next();
  };
};