import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Performance from '../models/Performance';

const router = Router();
router.use(protect as any);

// POST — create review
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ratings } = req.body;
    let overallScore = 0;
    if (ratings) {
      const values = Object.values(ratings) as number[];
      overallScore = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : 0;
    }
    const review = await Performance.create({
      ...req.body,
      reviewedBy: req.user?._id,
      overallScore
    });
    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET — all reviews (admin/manager)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Performance.find({})
      .populate('employee', 'firstName lastName department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// GET — reviews for specific employee  ← before /:id
router.get('/employee/:employeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Performance.find({ employee: req.params.employeeId })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// GET single review
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await Performance.findById(req.params.id)
      .populate('employee', 'firstName lastName')
      .populate('reviewedBy', 'name');
    if (!review) { res.status(404).json({ message: 'Review not found' }); return; }
    res.json(review);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// PUT — update review
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await Performance.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json(review);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;