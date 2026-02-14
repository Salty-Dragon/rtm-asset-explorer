import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  totalSent: {
    type: Number,
    default: 0
  },
  firstSeenBlock: Number,
  lastSeenBlock: Number,
  firstSeenAt: Date,
  lastSeenAt: {
    type: Date,
    index: true
  },
  transactionCount: {
    type: Number,
    default: 0,
    index: true
  },
  assetBalances: [{
    assetId: String,
    balance: Number,
    assets: [String],
    lastUpdated: Date
  }],
  assetsCreated: {
    type: Number,
    default: 0
  },
  assetsOwned: {
    type: Number,
    default: 0
  },
  profile: {
    username: String,
    displayName: String,
    bio: String,
    avatar: String,
    website: String,
    social: {
      twitter: String,
      discord: String,
      github: String
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  isCreator: {
    type: Boolean,
    default: false
  },
  isContract: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true
});

// Compound indexes
addressSchema.index({ balance: -1 });
addressSchema.index({ isCreator: 1, assetsCreated: -1 });
addressSchema.index({ 'profile.username': 1 }, { unique: true, sparse: true });
addressSchema.index({ 'assetBalances.assetId': 1 });

const Address = mongoose.model('Address', addressSchema);

export default Address;
