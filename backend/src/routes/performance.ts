import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Performance from '../models/Performance';

const router = Router();
router.use(protect as any);

// NEW: Self-service
router.get('/my', async (req: Request, res: Response) => {
  try {
    const reviews = await Performance.find({ employee: (req as AuthRequest).user._id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const reviews = await Performance.find({ employee: req.params.employeeId });
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;