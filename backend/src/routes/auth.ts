import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import User from '../models/User';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) { res.status(400).json({ message: 'Email already exists' }); return; }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (err: any) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('JWT exists:', !!process.env.JWT_SECRET);

    if (!email || !password) { res.status(400).json({ message: 'Email and password required' }); return; }

    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', !!user);
    if (!user) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    console.log('Login success for:', email);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (err: any) {
    console.error('=== LOGIN ERROR ===', err.message, err.stack);
    res.status(500).json({ message: err.message });
  }
});

export default router;