import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Payroll from '../models/Payroll';

const router = Router();
router.use(protect as any);

// NEW: Self-service
router.get('/my', async (req: Request, res: Response) => {
  try {
    const payslips = await Payroll.find({ employee: (req as AuthRequest).user._id }).sort({ year: -1, month: -1 });
    res.json(payslips);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// Existing routes...
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
    const payslips = await Payroll.find({ employee: req.params.employeeId }).sort({ year: -1, month: -1 });
    res.json(payslips);
});

export default router;