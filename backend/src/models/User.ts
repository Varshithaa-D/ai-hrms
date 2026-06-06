import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'management_admin' | 'senior_manager' | 'hr_recruiter' | 'employee';
  employeeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['management_admin','senior_manager','hr_recruiter','employee'], required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);