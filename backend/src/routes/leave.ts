import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Leave from '../models/Leave';

const router = Router();
router.use(protect as any);

// NEW: Self-service
router.get('/my', async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find({ employee: (req as AuthRequest).user._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;
    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    const leave = await Leave.create({ ...req.body, employee: (req as AuthRequest).user._id, totalDays });
    res.status(201).json(leave);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find().populate('employee', 'firstName lastName');
    res.json(leaves);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;