import mongoose, { Document, Schema } from 'mongoose';

export interface ILeave extends Document {
  employee: mongoose.Types.ObjectId;
  leaveType: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'unpaid';
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
}

const LeaveSchema = new Schema<ILeave>({
  employee:        { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType:       { type: String, enum: ['casual','sick','earned','maternity','paternity','unpaid'], required: true },
  startDate:       { type: Date, required: true },
  endDate:         { type: Date, required: true },
  totalDays:       { type: Number, required: true },
  reason:          { type: String, required: true },
  status:          { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  approvedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt:      { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

export default mongoose.model<ILeave>('Leave', LeaveSchema);