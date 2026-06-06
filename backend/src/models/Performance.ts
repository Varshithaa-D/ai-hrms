import mongoose, { Document, Schema } from 'mongoose';

export interface IPerformance extends Document {
  employee: mongoose.Types.ObjectId;
  reviewPeriod: string;
  reviewedBy: mongoose.Types.ObjectId;
  goals: { title: string; target: string; achieved: string; score: number }[];
  ratings: {
    technical: number;
    communication: number;
    teamwork: number;
    leadership: number;
    punctuality: number;
  };
  overallScore: number;
  strengths: string;
  areasOfImprovement: string;
  managerComments: string;
  status: 'draft' | 'submitted' | 'acknowledged';
}

const PerformanceSchema = new Schema<IPerformance>({
  employee:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewPeriod: { type: String, required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  goals: [{
    title:    String,
    target:   String,
    achieved: String,
    score:    { type: Number, min: 0, max: 10 },
  }],
  ratings: {
    technical:     { type: Number, min: 1, max: 10, default: 5 },
    communication: { type: Number, min: 1, max: 10, default: 5 },
    teamwork:      { type: Number, min: 1, max: 10, default: 5 },
    leadership:    { type: Number, min: 1, max: 10, default: 5 },
    punctuality:   { type: Number, min: 1, max: 10, default: 5 },
  },
  overallScore:        { type: Number, default: 0 },
  strengths:           { type: String },
  areasOfImprovement:  { type: String },
  managerComments:     { type: String },
  status:              { type: String, enum: ['draft','submitted','acknowledged'], default: 'draft' },
}, { timestamps: true });

export default mongoose.model<IPerformance>('Performance', PerformanceSchema);