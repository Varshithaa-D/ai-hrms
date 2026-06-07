import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import Leave from '../models/Leave';
import Employee from '../models/Employee';

const router = Router();
router.use(protect as any);

// POST — apply for leave
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    
    const leave = await Leave.create({ ...req.body, totalDays });
    
    const populated = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName department designation');
      
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET — list leaves
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, status } = req.query;
    const filter: any = {};
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    
    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName department designation employeeId')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
      
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — approve or reject
router.put('/:id/status',
  authorize('management_admin', 'senior_manager', 'hr_recruiter') as any,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, rejectionReason } = req.body;
      const update: any = {
        status,
        approvedBy: req.user?._id,
        approvedAt: new Date()
      };
      
      if (rejectionReason) update.rejectionReason = rejectionReason;
      
      const leave = await Leave.findByIdAndUpdate(req.params.id, update, { new: true })
        .populate('employee', 'firstName lastName department');
        
      if (!leave) { 
        res.status(404).json({ message: 'Leave not found' }); 
        return; 
      }
      res.json(leave);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET single leave
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName department');
      
    if (!leave) { 
      res.status(404).json({ message: 'Leave not found' }); 
      return; 
    }
    res.json(leave);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;