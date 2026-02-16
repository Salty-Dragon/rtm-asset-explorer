/**
 * Shared transformation utilities for converting database documents
 * and blockchain RPC responses to frontend-expected formats.
 */

/**
 * Transform a database asset document OR blockchain RPC response to the frontend-expected format.
 * Maps field names from the DB schema to the frontend Asset type.
 * Handles both database documents and blockchain RPC responses.
 * 
 * @param {Object} asset - Asset document or RPC response
 * @returns {Object} Transformed asset object
 */
export function transformAsset(asset) {
  const obj = asset.toObject ? asset.toObject() : { ...asset };

  // Ensure metadata.attributes is an array
  if (obj.metadata?.attributes && !Array.isArray(obj.metadata.attributes)) {
    obj.metadata.attributes = Object.values(obj.metadata.attributes);
  }

  // Handle both database fields and blockchain RPC fields for amount/units
  // Database uses: totalSupply, circulatingSupply, decimals
  // Frontend uses: amount (total supply), units (circulating/available supply)
  // Blockchain RPC may use different field names
  const amount = obj.totalSupply ?? obj.amount ?? 0;
  const units = obj.circulatingSupply ?? obj.units ?? 0;

  return {
    _id: obj._id,
    assetId: obj.assetId,
    name: obj.name,
    type: obj.type === 'non-fungible' ? 'nft' : 'fungible',
    amount: amount,
    units: units,
    reissuable: obj.updatable ?? obj.reissuable ?? false,
    hasIpfs: !!obj.ipfsHash,
    ipfsHash: obj.ipfsHash || undefined,
    txid: obj.createdTxid ?? obj.txid,
    height: obj.createdBlockHeight ?? obj.height,
    blockTime: obj.createdAt ? new Date(obj.createdAt).getTime() / 1000 : obj.blockTime,
    owner: obj.creator ?? obj.owner,
    metadata: obj.metadata || undefined,
    transferCount: obj.transferCount ?? 0,
    views: obj.views ?? 0,
    isSubAsset: obj.isSubAsset ?? false,
    parentAssetName: obj.parentAssetName || undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Transform a database asset transfer document to the frontend-expected format.
 * Maps field names from the DB schema to the frontend AssetTransfer type.
 * 
 * @param {Object} transfer - Transfer document
 * @returns {Object} Transformed transfer object
 */
export function transformAssetTransfer(transfer) {
  const obj = transfer.toObject ? transfer.toObject() : { ...transfer };

  return {
    _id: obj._id,
    assetId: obj.assetId,
    assetName: obj.assetName,
    txid: obj.txid,
    vout: obj.vout ?? undefined,
    from: obj.from,
    to: obj.to,
    amount: obj.amount,
    height: obj.blockHeight ?? obj.height,
    blockTime: obj.timestamp ? new Date(obj.timestamp).getTime() / 1000 : undefined,
    timestamp: obj.timestamp,
  };
}
