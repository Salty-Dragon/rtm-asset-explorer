import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['fungible', 'non-fungible'],
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    required: true,
    index: true
  },
  createdTxid: {
    type: String,
    required: true
  },
  createdBlockHeight: {
    type: Number,
    required: true
  },
  creator: {
    type: String,
    required: true,
    index: true
  },
  currentOwner: {
    type: String,
    index: true
  },
  totalSupply: {
    type: Number,
    default: 0
  },
  circulatingSupply: {
    type: Number,
    default: 0
  },
  decimals: {
    type: Number,
    default: 0
  },
  metadata: {
    name: String,
    description: String,
    image: String,
    imageUrl: String,
    animationUrl: String,
    externalUrl: String,
    attributes: [{
      trait_type: String,
      value: mongoose.Schema.Types.Mixed,
      display_type: String
    }],
    properties: mongoose.Schema.Types.Mixed,
    rawMetadata: mongoose.Schema.Types.Mixed
  },
  ipfsHash: {
    type: String,
    index: true
  },
  ipfsVerified: {
    type: Boolean,
    default: false
  },
  ipfsLastChecked: Date,
  transferCount: {
    type: Number,
    default: 0
  },
  lastTransfer: {
    txid: String,
    from: String,
    to: String,
    timestamp: Date
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  hidden: {
    type: Boolean,
    default: false
  },
  searchText: String,
  tags: {
    type: [String],
    index: true
  },
  categories: {
    type: [String],
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
assetSchema.index({ creator: 1, createdAt: -1 });
assetSchema.index({ currentOwner: 1, createdAt: -1 });
assetSchema.index({ type: 1, createdAt: -1 });
assetSchema.index({ views: -1 });
assetSchema.index({ featured: 1, createdAt: -1 });

// Text index for search
assetSchema.index({
  name: 'text',
  'metadata.name': 'text',
  'metadata.description': 'text',
  searchText: 'text',
  tags: 'text'
}, {
  name: 'asset_text_search',
  weights: {
    name: 10,
    'metadata.name': 10,
    tags: 5,
    'metadata.description': 3,
    searchText: 1
  }
});

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
