import mongoose, { Document, Schema } from 'mongoose';

export interface IPayroll extends Document {
  employee: mongoose.Types.ObjectId;
  month: number;
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  pf: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  daysWorked: number;
  status: 'draft' | 'processed' | 'paid';
  paidAt?: Date;
}

const PayrollSchema = new Schema<IPayroll>({
  employee:        { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month:           { type: Number, required: true },
  year:            { type: Number, required: true },
  basic:           { type: Number, default: 0 },
  hra:             { type: Number, default: 0 },
  allowances:      { type: Number, default: 0 },
  grossSalary:     { type: Number, default: 0 },
  pf:              { type: Number, default: 0 },
  esi:             { type: Number, default: 0 },
  tds:             { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary:       { type: Number, default: 0 },
  daysWorked:      { type: Number, default: 0 },
  status:          { type: String, enum: ['draft','processed','paid'], default: 'draft' },
  paidAt:          { type: Date },
}, { timestamps: true });

PayrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model<IPayroll>('Payroll', PayrollSchema);