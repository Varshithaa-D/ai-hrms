import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) { res.status(401).json({ message: 'Not authorized' }); return; }
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid' }); return;
  }
};