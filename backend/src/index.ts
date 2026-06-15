import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db';

import authRoutes        from './routes/auth';
import employeeRoutes    from './routes/employees';
import attendanceRoutes  from './routes/attendance';
import leaveRoutes       from './routes/leave';
import payrollRoutes     from './routes/payroll';
import performanceRoutes from './routes/performance';
import jobRoutes         from './routes/jobs';

console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED ✓' : 'MISSING ✗');
console.log('MONGO_URI: ', process.env.MONGO_URI  ? 'LOADED ✓' : 'MISSING ✗');

connectDB();

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: '*', credentials: true }
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Root Health Check ─────────────────────────────────────
app.get('/', (_, res) => res.json({ 
  status: 'FWC HRMS Backend API is running', 
  health: '/api/health' 
}));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/employees',   employeeRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/leave',       leaveRoutes);
app.use('/api/payroll',     payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/jobs',        jobRoutes);

// ── Debug: print all registered routes ───────────────────
console.log('\n── Registered API routes ──');
['/api/auth','/api/employees','/api/attendance','/api/leave','/api/payroll','/api/performance','/api/jobs']
  .forEach(r => console.log(' ✓', r));
console.log('───────────────────────────\n');

// ── Socket.io ─────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_room', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

// ── Health ────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  timestamp: new Date(),
  routes: ['auth','employees','attendance','leave','payroll','performance','jobs']
}));

// ── 404 catch-all ─────────────────────────────────────────
app.use((req, res) => {
  console.log('404 NOT FOUND:', req.method, req.path);
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));