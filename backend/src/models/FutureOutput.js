import mongoose from 'mongoose';

const futureOutputSchema = new mongoose.Schema({
  txid: {
    type: String,
    required: true,
    index: true
  },
  vout: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['rtm', 'asset'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  amountSat: {
    type: Number
  },
  assetId: {
    type: String,
    index: true
  },
  assetName: {
    type: String,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  
  // Future parameters
  maturity: {
    type: Number,
    required: true
  },
  lockTime: {
    type: Number,
    required: true
  },
  updatableByDestination: {
    type: Boolean,
    default: false
  },
  
  // Unlock conditions
  createdHeight: {
    type: Number,
    required: true,
    index: true
  },
  createdTime: {
    type: Date,
    required: true
  },
  unlockHeight: {
    type: Number,
    required: true,
    index: true
  },
  unlockTime: {
    type: Date,
    required: true,
    index: true
  },
  
  // Status
  isUnlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  unlockedAt: {
    type: Date
  },
  unlockedBy: {
    type: String,
    enum: ['confirmations', 'time']
  },
  status: {
    type: String,
    enum: ['locked', 'unlocked', 'spent'],
    default: 'locked',
    index: true
  },
  spentTxid: {
    type: String
  },
  spentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Unique index on txid + vout
futureOutputSchema.index({ txid: 1, vout: 1 }, { unique: true });

// Compound indexes for queries
futureOutputSchema.index({ status: 1, unlockHeight: 1 });
futureOutputSchema.index({ status: 1, unlockTime: 1 });
futureOutputSchema.index({ recipient: 1, status: 1 });
futureOutputSchema.index({ assetId: 1, status: 1 });
futureOutputSchema.index({ type: 1, status: 1 });

const FutureOutput = mongoose.model('FutureOutput', futureOutputSchema);

export default FutureOutput;
