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

// Debug — remove after login works
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED ✓' : 'MISSING ✗');
console.log('MONGO_URI: ', process.env.MONGO_URI  ? 'LOADED ✓' : 'MISSING ✗');

connectDB();

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/employees',   employeeRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/leave',       leaveRoutes);
app.use('/api/payroll',     payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/jobs',        jobRoutes);

io.on('connection', (socket) => {
  socket.on('join_room', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));