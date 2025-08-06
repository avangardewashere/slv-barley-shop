import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  role: 'superadmin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['superadmin'],
    default: 'superadmin',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

// Ensure maximum 2 superadmin users
AdminSchema.pre('save', async function(next) {
  if (this.isNew) {
    const adminCount = await mongoose.model('Admin').countDocuments({ role: 'superadmin', isActive: true });
    if (adminCount >= 2) {
      throw new Error('Maximum 2 superadmin users allowed');
    }
  }
  next();
});

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);