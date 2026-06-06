import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  hoursWorked: number;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave';
  notes: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  employee:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:        { type: Date, required: true },
  clockIn:     { type: Date },
  clockOut:    { type: Date },
  hoursWorked: { type: Number, default: 0 },
  status:      { type: String, enum: ['present','absent','half_day','late','on_leave'], default: 'present' },
  notes:       { type: String, default: '' },
}, { timestamps: true });

// One record per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);