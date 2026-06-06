import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  employeeId: string;
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  joiningDate: Date;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
  };
  manager: mongoose.Types.ObjectId;
  address: string;
  emergencyContact: { name: string; phone: string; relation: string };
  documents: { name: string; url: string }[];
  isActive: boolean;
}

const EmployeeSchema = new Schema<IEmployee>({
  employeeId:      { type: String, required: true, unique: true },
  userId:          { type: Schema.Types.ObjectId, ref: 'User' },
  firstName:       { type: String, required: true },
  lastName:        { type: String, required: true },
  email:           { type: String, required: true, unique: true },
  phone:           { type: String },
  department:      { type: String, required: true },
  designation:     { type: String, required: true },
  employmentType:  { type: String, enum: ['full_time','part_time','contract','intern'], default: 'full_time' },
  joiningDate:     { type: Date, required: true },
  salary: {
    basic:       { type: Number, default: 0 },
    hra:         { type: Number, default: 0 },
    allowances:  { type: Number, default: 0 },
    deductions:  { type: Number, default: 0 },
  },
  manager:          { type: Schema.Types.ObjectId, ref: 'Employee' },
  address:          { type: String },
  emergencyContact: {
    name:     { type: String },
    phone:    { type: String },
    relation: { type: String },
  },
  documents: [{ name: String, url: String }],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);