import mongoose from 'mongoose';

const syncStateSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    unique: true,
    enum: ['blocks', 'assets', 'futures'],
    index: true
  },
  currentBlock: {
    type: Number,
    default: 0,
    index: true
  },
  targetBlock: {
    type: Number,
    default: 0
  },
  startBlock: {
    type: Number,
    default: 0
  },
  blocksProcessed: {
    type: Number,
    default: 0
  },
  itemsProcessed: {
    type: Number,
    default: 0
  },
  averageBlockTime: {
    type: Number,
    default: 0
  },
  estimatedCompletion: {
    type: Date
  },
  status: {
    type: String,
    enum: ['syncing', 'synced', 'error', 'paused', 'not_started'],
    default: 'not_started',
    index: true
  },
  lastError: {
    type: String
  },
  lastSyncedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update timestamp on save
syncStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SyncState = mongoose.model('SyncState', syncStateSchema);

export default SyncState;
