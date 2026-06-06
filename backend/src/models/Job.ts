import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  title: string;
  department: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHave: string[];
  salaryRange: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  location: string;
  screeningQuestions: string[];
  status: 'draft' | 'active' | 'closed';
  createdBy: mongoose.Types.ObjectId;
  applicantCount: number;
}

const JobSchema = new Schema<IJob>({
  title:               { type: String, required: true },
  department:          { type: String, required: true },
  description:         { type: String },
  responsibilities:    [String],
  requiredSkills:      [String],
  niceToHave:          [String],
  salaryRange:         { type: String },
  seniority:           { type: String, enum: ['junior','mid','senior','lead'], default: 'mid' },
  employmentType:      { type: String, enum: ['full_time','part_time','contract','intern'], default: 'full_time' },
  location:            { type: String, default: 'Bangalore, India' },
  screeningQuestions:  [String],
  status:              { type: String, enum: ['draft','active','closed'], default: 'draft' },
  createdBy:           { type: Schema.Types.ObjectId, ref: 'User' },
  applicantCount:      { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<IJob>('Job', JobSchema);