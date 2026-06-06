import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import Attendance from '../models/Attendance';

const router = Router();
router.use(protect as any);

router.post('/clock-in', async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const existing = await Attendance.findOne({ employee: req.body.employeeId, date: today });
    if (existing) { res.status(400).json({ message: 'Already clocked in today' }); return; }
    const record = await Attendance.create({
      employee: req.body.employeeId, date: today, clockIn: new Date(), status: 'present'
    });
    res.status(201).json(record);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.put('/clock-out/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    const clockOut = new Date();
    const hoursWorked = (clockOut.getTime() - record.clockIn.getTime()) / 3600000;
    const updated = await Attendance.findByIdAndUpdate(req.params.id,
      { clockOut, hoursWorked: Math.round(hoursWorked * 100) / 100 }, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/summary/today', async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [present, absent, late] = await Promise.all([
      Attendance.countDocuments({ date: today, status: 'present' }),
      Attendance.countDocuments({ date: today, status: 'absent' }),
      Attendance.countDocuments({ date: today, status: 'late' }),
    ]);
    res.json({ present, absent, late, date: today });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/employee/:employeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const filter: any = { employee: req.params.employeeId };
    if (month && year) {
      filter.date = {
        $gte: new Date(Number(year), Number(month) - 1, 1),
        $lte: new Date(Number(year), Number(month), 0)
      };
    }
    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;