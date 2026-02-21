import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { logger } from '../utils/logger.js';
import Asset from '../models/Asset.js';
import Transaction from '../models/Transaction.js';
import Address from '../models/Address.js';
import AssetTransfer from '../models/AssetTransfer.js';

const SIGNATURE_DISPLAY_LENGTH = 32;

class ExportGenerator {
  constructor() {
    this.exportDir = process.env.EXPORT_STORAGE_PATH || path.join(process.cwd(), 'exports');
  }

  async initialize() {
    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });
    logger.info('Export generator initialized');
  }

  async generateExport(exportRecord) {
    const { exportId, type, requestData } = exportRecord;
    
    logger.info(`Generating export ${exportId} (type: ${type})`);
    
    // Create temporary directory for this export
    const tempDir = path.join(this.exportDir, 'temp', exportId);
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      // Fetch data based on export type
      const data = await this.fetchData(type, requestData);
      
      // Generate files
      const jsonPath = await this.generateJSON(tempDir, data, exportRecord);
      const csvPath = await this.generateCSV(tempDir, data, type);
      const pdfPath = await this.generatePDF(tempDir, data, exportRecord);
      
      // Create ZIP archive
      const zipPath = await this.createZipArchive(
        tempDir,
        [jsonPath, csvPath, pdfPath],
        exportRecord
      );
      
      // Move ZIP to final location
      const finalPath = path.join(this.exportDir, `${exportId}.zip`);
      await fs.rename(zipPath, finalPath);
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      logger.info(`Export ${exportId} generated successfully`);
      
      return {
        filePath: finalPath,
        size: (await fs.stat(finalPath)).size
      };
    } catch (error) {
      // Clean up on error
      await fs.rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  async fetchData(type, requestData) {
    logger.debug(`Fetching data for export type: ${type}`);
    
    switch (type) {
      case 'asset':
        return await this.fetchAssetData(requestData);
      case 'address':
        return await this.fetchAddressData(requestData);
      case 'multi':
        return await this.fetchMultiAssetData(requestData);
      case 'legal':
        return await this.fetchLegalData(requestData);
      case 'provenance':
        return await this.fetchProvenanceData(requestData);
      default:
        throw new Error(`Unknown export type: ${type}`);
    }
  }

  async fetchAssetData(requestData) {
    const { assetId, includeTransactions } = requestData;
    
    const asset = await Asset.findOne({ assetId }).lean();
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    
    let transactions = [];
    if (includeTransactions) {
      transactions = await AssetTransfer.find({ assetId })
        .sort({ timestamp: -1 })
        .lean();
    }
    
    return {
      asset,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        createdAt: asset.createdAt,
        currentOwner: asset.currentOwner
      }
    };
  }

  async fetchAddressData(requestData) {
    const { address, includeTransactions } = requestData;
    
    const addressDoc = await Address.findOne({ address }).lean();
    if (!addressDoc) {
      throw new Error(`Address not found: ${address}`);
    }
    
    let transactions = [];
    if (includeTransactions) {
      transactions = await Transaction.find({
        $or: [
          { 'outputs.address': address },
          { 'inputs.address': address }
        ]
      }).sort({ timestamp: -1 }).lean();
    }
    
    return {
      address: addressDoc,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        balance: addressDoc.balance
      }
    };
  }

  async fetchMultiAssetData(requestData) {
    const { assetIds, includeTransactions } = requestData;
    
    const assets = await Asset.find({ assetId: { $in: assetIds } }).lean();
    
    let transactions = [];
    if (includeTransactions) {
      transactions = await Transaction.find({
        $or: [
          { 'vout.assetId': { $in: assetIds } },
          { 'vin.assetId': { $in: assetIds } }
        ]
      }).sort({ timestamp: -1 }).lean();
    }
    
    return {
      assets,
      transactions,
      summary: {
        totalAssets: assets.length,
        totalTransactions: transactions.length
      }
    };
  }

  async fetchLegalData(requestData) {
    // Legal exports include the same data plus legal metadata
    const baseData = requestData.assetId 
      ? await this.fetchAssetData(requestData)
      : await this.fetchAddressData(requestData);
    
    return {
      ...baseData,
      legalInfo: requestData.legalInfo
    };
  }

  async fetchProvenanceData(requestData) {
    const { assetId } = requestData;
    
    const asset = await Asset.findOne({ assetId }).lean();
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    
    // Get all transactions for provenance chain
    const transactions = await AssetTransfer.find({ assetId })
      .sort({ timestamp: 1 })
      .lean(); // Chronological order
    
    // Build ownership chain
    const ownershipChain = this.buildOwnershipChain(transactions);
    
    return {
      asset,
      transactions,
      ownershipChain,
      summary: {
        totalTransfers: ownershipChain.length,
        createdAt: asset.createdAt,
        currentOwner: asset.currentOwner
      }
    };
  }

  buildOwnershipChain(transactions) {
    const chain = [];
    
    for (const tx of transactions) {
      const transfer = {
        txid: tx.txid,
        timestamp: tx.timestamp,
        blockHeight: tx.blockHeight,
        from: tx.from || 'Mint',
        to: tx.to || 'Unknown'
      };
      chain.push(transfer);
    }
    
    return chain;
  }

  async generateJSON(tempDir, data, exportRecord) {
    const jsonPath = path.join(tempDir, 'data.json');
    
    const exportData = {
      exportInfo: {
        type: exportRecord.type,
        exportId: exportRecord.exportId,
        createdAt: exportRecord.createdAt,
        version: '1.0'
      },
      verification: 'See verification.json in this archive',
      data
    };
    
    await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2));
    logger.debug(`JSON file generated: ${jsonPath}`);
    
    return jsonPath;
  }

  async generateCSV(tempDir, data, type) {
    const csvPath = path.join(tempDir, 'data.csv');
    
    // Flatten data for CSV format based on type
    let records = [];
    let headers = [];
    
    switch (type) {
      case 'asset':
      case 'legal':
        headers = [
          { id: 'txid', title: 'Transaction ID' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'blockHeight', title: 'Block Height' },
          { id: 'from', title: 'From' },
          { id: 'to', title: 'To' },
          { id: 'amount', title: 'Amount' }
        ];
        records = (data.transactions || []).map(tx => ({
          txid: tx.txid,
          timestamp: tx.timestamp,
          blockHeight: tx.blockHeight,
          from: tx.from || 'N/A',
          to: tx.to || 'N/A',
          amount: tx.amount || 0
        }));
        break;
      
      case 'address':
        headers = [
          { id: 'txid', title: 'Transaction ID' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'type', title: 'Type' },
          { id: 'amount', title: 'Amount' }
        ];
        records = (data.transactions || []).map(tx => ({
          txid: tx.txid,
          timestamp: tx.timestamp,
          type: 'transfer',
          amount: tx.outputs?.[0]?.amount || 0
        }));
        break;
      
      case 'multi':
        headers = [
          { id: 'assetId', title: 'Asset ID' },
          { id: 'name', title: 'Name' },
          { id: 'owner', title: 'Current Owner' },
          { id: 'transfers', title: 'Transfers' }
        ];
        records = (data.assets || []).map(asset => ({
          assetId: asset.assetId,
          name: asset.name,
          owner: asset.currentOwner,
          transfers: asset.transferCount || 0
        }));
        break;
      
      case 'provenance':
        headers = [
          { id: 'sequence', title: 'Sequence' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'from', title: 'From' },
          { id: 'to', title: 'To' },
          { id: 'txid', title: 'Transaction ID' }
        ];
        records = (data.ownershipChain || []).map((transfer, idx) => ({
          sequence: idx + 1,
          timestamp: transfer.timestamp,
          from: transfer.from,
          to: transfer.to,
          txid: transfer.txid
        }));
        break;
    }
    
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: headers
    });
    
    await csvWriter.writeRecords(records);
    logger.debug(`CSV file generated: ${csvPath}`);
    
    return csvPath;
  }

  async generatePDF(tempDir, data, exportRecord) {
    const pdfPath = path.join(tempDir, 'report.pdf');
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });
      
      const stream = createWriteStream(pdfPath);
      doc.pipe(stream);
      
      // Title page
      doc.fontSize(24).text('Raptoreum Asset Explorer', { align: 'center' });
      doc.fontSize(18).text('Export Report', { align: 'center' });
      doc.moveDown();
      
      // Export info
      doc.fontSize(12);
      doc.text(`Export Type: ${exportRecord.type.toUpperCase()}`);
      doc.text(`Export ID: ${exportRecord.exportId}`);
      doc.text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown();
      
      // Add Certificate of Authenticity for legal exports
      if (exportRecord.type === 'legal' && data.legalInfo) {
        this.addCertificateOfAuthenticity(doc, data.legalInfo, exportRecord);
      }
      
      // Data summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10).moveDown(0.5);
      
      if (data.summary) {
        Object.entries(data.summary).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`);
        });
      }
      
      doc.moveDown();

      // Asset Information section
      if (data.asset) {
        doc.fontSize(14).text('Asset Information', { underline: true });
        doc.fontSize(10).moveDown(0.5);
        doc.text(`Name: ${data.asset.name}`);
        doc.text(`Type: ${data.asset.type}`);
        doc.text(`Creator: ${data.asset.creator || 'Unknown'}`);
        doc.text(`Current Owner: ${data.asset.currentOwner || 'Unknown'}`);
        doc.text(`Created: ${data.asset.createdAt}`);
        doc.text(`Creation TX: ${data.asset.createdTxid}`);
        if (data.asset.ipfsHash) doc.text(`IPFS Hash: ${data.asset.ipfsHash}`);
        doc.moveDown();
      }

      // Address Information section
      if (data.address) {
        doc.fontSize(14).text('Address Information', { underline: true });
        doc.fontSize(10).moveDown(0.5);
        doc.text(`Address: ${data.address.address}`);
        doc.text(`Balance: ${data.address.balance || 0}`);
        doc.text(`Transaction Count: ${data.address.transactionCount || 0}`);
        doc.moveDown();
      }

      // Assets section (multi type)
      if (data.assets && data.assets.length > 0) {
        doc.fontSize(14).text('Assets', { underline: true });
        doc.fontSize(10).moveDown(0.5);
        data.assets.forEach((asset, i) => {
          doc.fontSize(9);
          doc.text(`${i + 1}. ${asset.name} (${asset.type})`);
          doc.text(`   Owner: ${asset.currentOwner || 'Unknown'}  |  Transfers: ${asset.transferCount || 0}`);
          doc.moveDown(0.3);
        });
        doc.moveDown();
      }

      // Ownership Chain section (provenance type)
      if (data.ownershipChain && data.ownershipChain.length > 0) {
        doc.fontSize(14).text('Ownership Chain', { underline: true });
        doc.fontSize(10).moveDown(0.5);
        data.ownershipChain.forEach((transfer, i) => {
          doc.fontSize(9);
          doc.text(`#${transfer.sequence || i + 1} — ${transfer.timestamp}`);
          doc.text(`   From: ${transfer.from}  →  To: ${transfer.to}`);
          doc.text(`   TXID: ${transfer.txid}`);
          doc.moveDown(0.3);
        });
        doc.moveDown();
      }

      // Transaction History section
      if (data.transactions && data.transactions.length > 0) {
        doc.fontSize(14).text('Transaction History', { underline: true });
        doc.fontSize(10).moveDown(0.5);
        doc.text(`Total transactions: ${data.transactions.length}`);
        doc.moveDown(0.5);

        const displayTxs = data.transactions.slice(0, 50);
        displayTxs.forEach((tx, i) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
          doc.fontSize(9);
          doc.text(`${i + 1}. TXID: ${tx.txid}`);
          doc.text(`   From: ${tx.from || 'N/A'}  →  To: ${tx.to || 'N/A'}`);
          doc.text(`   Amount: ${tx.amount || 0}  |  Block: ${tx.blockHeight}  |  Date: ${tx.timestamp}`);
          doc.moveDown(0.3);
        });

        if (data.transactions.length > 50) {
          doc.text(`... and ${data.transactions.length - 50} more transactions (see data.csv for full list)`);
        }
        doc.moveDown();
      }

      // Verification section - always render
      doc.fontSize(14).text('Blockchain Verification', { underline: true });
      doc.fontSize(10).moveDown(0.5);
      doc.text(`Token Asset: ${exportRecord.assetName || 'See verification.json'}`);
      doc.text(`Transaction ID: ${exportRecord.blockchainTxid || 'See verification.json'}`);
      doc.text(`File Hash: ${exportRecord.fileHash || 'See verification.json'}`);
      doc.text(`Signature: ${exportRecord.signature ? exportRecord.signature.substring(0, SIGNATURE_DISPLAY_LENGTH) + '...' : 'See verification.json'}`);
      doc.moveDown();
      doc.fontSize(8).text('Note: Complete verification data is available in verification.json included in this archive.');
      doc.moveDown();
      
      // Footer
      doc.fontSize(8).text(
        'This export is cryptographically signed and verifiable on the Raptoreum blockchain.',
        { align: 'center' }
      );
      
      doc.end();
      
      stream.on('finish', () => {
        logger.debug(`PDF file generated: ${pdfPath}`);
        resolve(pdfPath);
      });
      
      stream.on('error', reject);
    });
  }

  addCertificateOfAuthenticity(doc, legalInfo, exportRecord) {
    doc.addPage();
    doc.fontSize(16).text('═══════════════════════════════════════', { align: 'center' });
    doc.fontSize(18).text('CERTIFICATE OF AUTHENTICITY', { align: 'center' });
    doc.fontSize(16).text('═══════════════════════════════════════', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(12);
    doc.text('CASE INFORMATION', { underline: true });
    doc.fontSize(10).moveDown(0.5);
    if (legalInfo.caseReference) doc.text(`Case Reference: ${legalInfo.caseReference}`);
    if (legalInfo.court) doc.text(`Court: ${legalInfo.court}`);
    if (legalInfo.purpose) doc.text(`Purpose: ${legalInfo.purpose}`);
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text('EXPORT INFORMATION', { underline: true });
    doc.fontSize(10).moveDown(0.5);
    doc.text(`Export Type: ${exportRecord.type.toUpperCase()}`);
    doc.text(`Export ID: ${exportRecord.exportId}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text('BLOCKCHAIN VERIFICATION', { underline: true });
    doc.fontSize(10).moveDown(0.5);
    doc.text(`Token Asset: ${exportRecord.assetName || 'Pending'}`);
    doc.text(`Transaction ID: ${exportRecord.blockchainTxid || 'Pending'}`);
    doc.text(`IPFS Hash: ${exportRecord.ipfsHash || 'Pending'}`);
    doc.moveDown();
    
    doc.fontSize(8);
    doc.text('This certificate provides cryptographic proof that this export is authentic and unmodified.');
    doc.text('The blockchain token serves as permanent, immutable verification.');
    
    doc.addPage();
  }

  async createZipArchive(tempDir, filePaths, exportRecord) {
    const zipPath = path.join(tempDir, 'export.zip');
    
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        logger.debug(`ZIP archive created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      // Add files to archive
      filePaths.forEach(filePath => {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      });
      
      archive.finalize();
    });
  }

  async appendVerificationToZip(filePath, verificationData) {
    const zip = new AdmZip(filePath);
    zip.addFile(
      'verification.json',
      Buffer.from(JSON.stringify(verificationData, null, 2), 'utf8')
    );
    zip.writeZip(filePath);
    logger.info(`Verification data appended to ZIP: ${filePath}`);
  }

  async deleteExport(exportId) {
    const filePath = path.join(this.exportDir, `${exportId}.zip`);
    
    try {
      await fs.unlink(filePath);
      logger.info(`Export file deleted: ${exportId}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to delete export file ${exportId}:`, error);
      return false;
    }
  }
}

export default new ExportGenerator();
