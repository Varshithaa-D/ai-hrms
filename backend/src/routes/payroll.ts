import { Router, Request, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';

const router = Router();
router.use(protect as any);

// POST /api/payroll/generate  ← must be before /:id
router.post('/generate',
  authorize('management_admin', 'hr_recruiter') as any,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId, month, year, daysWorked } = req.body;

      const emp = await Employee.findById(employeeId);
      if (!emp) { res.status(404).json({ message: 'Employee not found' }); return; }

      const existing = await Payroll.findOne({ employee: employeeId, month, year });
      if (existing) { res.status(400).json({ message: 'Payroll already generated for this period' }); return; }

      const { basic, hra, allowances, deductions } = emp.salary;
      const grossSalary    = basic + hra + allowances;
      const pf             = Math.round(basic * 0.12);
      const esi            = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
      const tds            = grossSalary > 41667  ? Math.round(grossSalary * 0.10)   : 0;
      const totalDeductions = pf + esi + tds + (deductions || 0);
      const netSalary      = grossSalary - totalDeductions;

      const payroll = await Payroll.create({
        employee: employeeId, month, year,
        basic, hra, allowances, grossSalary,
        pf, esi, tds,
        otherDeductions: deductions || 0,
        totalDeductions, netSalary,
        daysWorked: daysWorked || 26,
        status: 'processed'
      });
      res.status(201).json(payroll);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/payroll/employee/:employeeId  ← also before /:id
router.get('/employee/:employeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const payslips = await Payroll.find({ employee: req.params.employeeId })
      .sort({ year: -1, month: -1 });
    res.json(payslips);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// GET /api/payroll (all payroll — admin only)
router.get('/',
  authorize('management_admin', 'hr_recruiter') as any,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const payrolls = await Payroll.find({})
        .populate('employee', 'firstName lastName department employeeId')
        .sort({ year: -1, month: -1 })
        .limit(100);
      res.json(payrolls);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  }
);

// PUT /api/payroll/:id/pay
router.put('/:id/pay',
  authorize('management_admin') as any,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payroll = await Payroll.findByIdAndUpdate(
        req.params.id,
        { status: 'paid', paidAt: new Date() },
        { new: true }
      );
      res.json(payroll);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  }
);

export default router;