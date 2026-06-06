import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import Job from '../models/Job';

const router = Router();
router.use(protect as any);

router.post('/', authorize('management_admin','hr_recruiter') as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await Job.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(job);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const jobs = await Job.find(filter).populate('createdBy','name').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }
    res.json(job);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', authorize('management_admin','hr_recruiter') as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(job);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;