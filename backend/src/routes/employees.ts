import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Employee from '../models/Employee';

const router = Router();
router.use(protect as any);

// NEW: Self-service
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Assuming your Employee model has a field 'user' that links to the User model
    const emp = await Employee.findOne({ user: (req as AuthRequest).user._id });
    if (!emp) return res.status(404).json({ message: 'Employee profile not found' });
    res.json(emp);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// Existing routes... (Keep your / and /:id routes)
export default router;