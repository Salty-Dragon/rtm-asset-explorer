import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyPrefix: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  organization: String,
  tier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
    index: true
  },
  rateLimit: {
    type: Number,
    default: 100
  },
  endpoints: [String],
  totalRequests: {
    type: Number,
    default: 0
  },
  lastUsed: Date,
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: Date
}, {
  timestamps: true
});

// Compound indexes
apiKeySchema.index({ active: 1, tier: 1 });
apiKeySchema.index({ email: 1 });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
