#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { resolveLocalDocumentPath } = require('./inspect-document-paths');

/**
 * Fetch document from API and process based on type
 * Supports: PDF, DOCX, images, text files
 *
 * Default: Extracts text + metadata
 * Optional: --extract-images, --extract-attachments
 *
 * Usage: node inspect-document.js <asset_id> [--extract-images] [--extract-attachments]
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    assetIdOrPath: args[0],  // Can be either asset ID or file path
    extractImages: false,
    extractAttachments: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--extract-images') {
      options.extractImages = true;
    } else if (arg === '--extract-attachments') {
      options.extractAttachments = true;
    }
  }

  return options;
}

/**
 * Load container variables (userId, currentRoomPath)
 */
function loadContainerVars() {
  try {
    const containerVars = JSON.parse(fs.readFileSync('/app/container_vars.json', 'utf8'));
    const currentRoomPath = containerVars.currentRoomPath;
    const currentRoom = containerVars.currentRoom;
    const userId = containerVars.userId;

    if (!userId) {
      console.error('❌ Error: No userId set in container vars');
      process.exit(1);
    }

    return { currentRoomPath, currentRoom, userId };
  } catch (err) {
    console.error('❌ Error reading container vars:', err.message);
    process.exit(1);
  }
}

/**
 * Find asset JSON file
 * Assets are always in the room root directory, never in subdirectories
 */
function findAssetJson(roomPath, assetId) {
  const filename = `general-asset-image-${assetId}.json`;
  const assetPath = path.join(roomPath, filename);

  if (fs.existsSync(assetPath)) {
    return assetPath;
  }

  return null;
}

/**
 * Detect file type from asset metadata
 */
function detectFileType(assetMeta) {
  const mimeType = assetMeta.props?.mimeType || '';
  const filename = assetMeta.props?.name || '';
  const isFileAsset = assetMeta.meta?.isFileAsset;

  // Check MIME type first
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';

  // Fallback to extension
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['txt', 'md', 'csv', 'json', 'js', 'ts', 'py', 'jsx', 'tsx', 'html', 'css'].includes(ext)) return 'text';

  return 'unknown';
}

/**
 * Fetch document from API
 */
async function fetchDocument(apiUrl, uploadId, userId, roomId) {
  const { signInternalRequestBody } = require('/app/src/internal-auth');
  const url = `${apiUrl}/api/agent/fetch-image`; // Reuse existing endpoint
  const body = { uploadId, userId, roomId };
  const { payload, headers } = await signInternalRequestBody(body);

  console.log(`📡 Fetching document from API...`);
  console.log(`📡 Upload ID: ${uploadId}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-worker': 'agentapi',
      ...headers,
    },
    body: payload,
  });

  const data = await response.text();

  try {
    const json = JSON.parse(data);
    if (!response.ok) {
      return { success: false, error: json.error || `HTTP ${response.status}` };
    }
    return {
      success: true,
      base64: json.base64,
      contentType: json.contentType,
      size: json.size,
    };
  } catch (e) {
    return { success: false, error: `Invalid response: ${e.message}` };
  }
}

/**
 * Detect MIME type from buffer and filename
 */
function detectMimeType(buffer, filename) {
  // Check magic bytes first
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4).toString('hex');
    if (header === '25504446') return 'application/pdf';
    if (header.startsWith('504b0304') && filename.toLowerCase().endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('89504e47')) return 'image/png';
  }

  // Fallback to extension
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Parse pdfinfo output into object
 */
function parsePdfInfo(infoRaw) {
  const lines = infoRaw.split('\n');
  const info = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      info[key] = value;
    }
  }
  return info;
}

/**
 * Process PDF document
 */
async function processPdf(buffer, options) {
  const tempPath = `/tmp/${crypto.randomUUID()}.pdf`;
  fs.writeFileSync(tempPath, buffer);

  const results = {
    type: 'pdf',
    metadata: {},
    text: '',
    images: [],
    attachments: []
  };

  try {
    // Extract metadata
    try {
      const infoRaw = execSync(`pdfinfo "${tempPath}"`, { encoding: 'utf8' });
      results.metadata = parsePdfInfo(infoRaw);
    } catch (err) {
      console.warn('Could not extract PDF metadata');
    }

    // Extract text (always)
    try {
      const text = execSync(`pdftotext "${tempPath}" -`, { encoding: 'utf8' });
      results.text = text.length > 100000
        ? text.substring(0, 100000) + '\n[...truncated]'
        : text;
    } catch (err) {
      console.warn('Text extraction failed');
    }

    // Extract images if requested
    if (options.extractImages) {
      const imageDir = `/tmp/${crypto.randomUUID()}`;
      fs.mkdirSync(imageDir, { recursive: true });

      try {
        execSync(`pdfimages -png "${tempPath}" "${imageDir}/page"`);
        const imageFiles = fs.readdirSync(imageDir).filter(f => f.endsWith('.png'));
        results.images = imageFiles.map(f => {
          const imagePath = path.join(imageDir, f);
          const imageBuffer = fs.readFileSync(imagePath);
          return {
            filename: f,
            base64: imageBuffer.toString('base64'),
            size: imageBuffer.length
          };
        });
      } catch (err) {
        console.warn('Image extraction failed');
      } finally {
        if (fs.existsSync(imageDir)) {
          fs.rmSync(imageDir, { recursive: true });
        }
      }
    }

    // Extract attachments if requested
    if (options.extractAttachments) {
      const attachDir = `/tmp/${crypto.randomUUID()}`;
      fs.mkdirSync(attachDir, { recursive: true });

      try {
        execSync(`pdfdetach -saveall -o "${attachDir}" "${tempPath}"`);
        const attachFiles = fs.readdirSync(attachDir);
        results.attachments = attachFiles.map(f => ({
          filename: f,
          size: fs.statSync(path.join(attachDir, f)).size
        }));
      } catch (err) {
        // No attachments
      } finally {
        if (fs.existsSync(attachDir)) {
          fs.rmSync(attachDir, { recursive: true });
        }
      }
    }
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return results;
}

/**
 * Process DOCX document
 */
async function processDocx(buffer) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  let text = result.value.replace(/\f/g, '\n');

  if (text.length > 100000) {
    text = text.substring(0, 100000) + '\n[...truncated]';
  }

  return {
    type: 'docx',
    text,
    metadata: { messages: result.messages }
  };
}

/**
 * Process image file
 */
async function processImage(buffer, mimeType) {
  const sharp = require('sharp');
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  let imageBuffer = buffer;

  if (buffer.length > MAX_SIZE) {
    imageBuffer = await sharp(buffer)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  return {
    type: 'image',
    metadata: {
      mimeType,
      originalSize: buffer.length,
      compressed: buffer.length > MAX_SIZE
    },
    images: [{
      filename: 'image',
      base64: imageBuffer.toString('base64'),
      size: imageBuffer.length
    }]
  };
}

/**
 * Process document - main entry point
 */
async function processDocument(buffer, filename, assetId, roomPath, options) {
  const mimeType = detectMimeType(buffer, filename);

  // Processing options
  const processOptions = {
    extractImages: options.extractImages,
    extractAttachments: options.extractAttachments,
  };

  // Process based on type
  let serviceResult;
  if (mimeType === 'application/pdf') {
    serviceResult = await processPdf(buffer, processOptions);
  } else if (mimeType.includes('wordprocessing') || mimeType.includes('msword')) {
    serviceResult = await processDocx(buffer);
  } else if (mimeType.startsWith('image/')) {
    serviceResult = await processImage(buffer, mimeType);
  } else if (mimeType.startsWith('text/')) {
    serviceResult = { type: 'text', text: buffer.toString('utf8') };
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Convert to agent script format
  const results = {
    type: serviceResult.type,
    assetId,
    metadata: serviceResult.metadata || null,
    text: serviceResult.text || null,
    images: [],
    attachments: [],
    truncated: serviceResult.text && serviceResult.text.includes('[...truncated]'),
  };

  // For image-type documents, store the buffer for direct saving
  if (serviceResult.type === 'image' && serviceResult.images && serviceResult.images[0]) {
    results.buffer = Buffer.from(serviceResult.images[0].base64, 'base64');
    results.mimeType = serviceResult.metadata?.mimeType || 'image/jpeg';
    results.compressed = serviceResult.metadata?.compressed || false;
    // Don't populate results.images array - this is the document itself, not extracted images
  }
  // For PDF images (extracted FROM a PDF), save to images/ subfolder
  else if (serviceResult.images && serviceResult.images.length > 0) {
    const imageDir = path.join(roomPath, `.canvas-documents/${assetId}/images`);
    fs.mkdirSync(imageDir, { recursive: true });

    results.images = serviceResult.images.map(img => {
      const imagePath = path.join(imageDir, img.filename);
      fs.writeFileSync(imagePath, Buffer.from(img.base64, 'base64'));
      return path.relative(roomPath, imagePath);
    });
  }

  // For attachments, note that they would need to be saved similarly
  if (serviceResult.attachments && serviceResult.attachments.length > 0) {
    results.attachments = serviceResult.attachments.map(att => att.filename);
  }

  return results;
}

/**
 * Save results to .canvas-documents/
 */
function saveResults(roomPath, assetId, results) {
  const docsDir = path.join(roomPath, '.canvas-documents');
  fs.mkdirSync(docsDir, { recursive: true });

  const savedFiles = {};

  // Save metadata JSON (lightweight, can be committed to git)
  const metaPath = path.join(docsDir, `${assetId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({
    assetId,
    type: results.type,
    processedAt: new Date().toISOString(),
    metadata: results.metadata,
    hasText: !!results.text,
    textWordCount: results.text ? results.text.split(/\s+/).filter(w => w.length > 0).length : 0,
    hasImages: results.images?.length > 0,
    imageCount: results.images?.length || 0,
    hasAttachments: results.attachments?.length > 0,
    attachmentCount: results.attachments?.length || 0,
    truncated: results.truncated || false,
  }, null, 2));
  savedFiles.metaPath = metaPath;

  // Save text (TEMP - will be lost on git reset)
  if (results.text) {
    const textPath = path.join(docsDir, `${assetId}.txt`);
    fs.writeFileSync(textPath, results.text, 'utf8');
    savedFiles.textPath = textPath;
  }

  // For image-type documents, save directly (TEMP - will be lost on git reset)
  if (results.type === 'image' && results.buffer) {
    const ext = results.mimeType === 'image/jpeg' ? '.jpg' :
                 results.mimeType === 'image/png' ? '.png' :
                 results.mimeType === 'image/gif' ? '.gif' :
                 results.mimeType === 'image/webp' ? '.webp' :
                 results.mimeType === 'image/svg+xml' ? '.svg' : '.bin';
    const imgPath = path.join(docsDir, `${assetId}${ext}`);
    fs.writeFileSync(imgPath, results.buffer);
    savedFiles.imagePath = imgPath;
  }

  return savedFiles;
}

/**
 * Print agent-friendly results
 */
function printResults(results, savedFiles, roomPath) {
  console.log(`✅ Document processed: ${results.assetId}`);
  console.log(`Type: ${results.type}`);

  // For image-type documents
  if (results.type === 'image' && savedFiles.imagePath) {
    const ext = path.extname(savedFiles.imagePath);
    const fullPath = path.join(roomPath, '.canvas-documents', `${results.assetId}${ext}`);
    console.log(`Image saved to: ${fullPath}`);
    if (results.compressed) {
      console.log(`Note: Image was compressed to reduce size`);
    }
    console.log('');
    console.log('To view this image (Claude has vision), use:');
    console.log(`Read ${fullPath}`);
    return;
  }

  // For PDF/DOCX documents
  if (results.metadata && results.metadata.Pages) {
    console.log(`Pages: ${results.metadata.Pages}`);
    if (results.metadata.Author) console.log(`Author: ${results.metadata.Author}`);
    if (results.metadata.CreationDate) console.log(`Created: ${results.metadata.CreationDate}`);
  }

  if (results.text) {
    const wordCount = results.text.split(/\s+/).filter(w => w.length > 0).length;
    const fullPath = path.join(roomPath, '.canvas-documents', `${results.assetId}.txt`);
    console.log(`Text extracted: ${wordCount} words`);
    console.log(`Text saved to: ${fullPath}`);
    if (results.truncated) {
      console.log(`Warning: Text truncated at 100,000 characters`);
    }
  }

  // For images extracted FROM PDFs (not image-type documents)
  if (results.images?.length) {
    const imagesDir = path.join(roomPath, '.canvas-documents', results.assetId, 'images');
    console.log(`Images extracted from PDF: ${results.images.length}`);
    console.log(`Images location: ${imagesDir}/`);
    results.images.forEach((img) => {
      console.log(`  - ${img}`);
    });
  }

  if (results.attachments?.length) {
    console.log(`Attachments extracted: ${results.attachments.length}`);
    results.attachments.forEach(att => {
      console.log(`  - ${att}`);
    });
  }

  // Clear instructions for agent
  console.log('');
  if (results.text) {
    const fullPath = path.join(roomPath, '.canvas-documents', `${results.assetId}.txt`);
    console.log('To read the extracted text, use:');
    console.log(`Read ${fullPath}`);
  } else if (results.images?.length) {
    console.log('To view extracted images, use:');
    console.log(`Read ${results.images[0]}`);
  }
}

/**
 * Main function
 */
async function inspectDocument(assetIdOrPath, options) {
  try {
    // 1. Load container vars (userId, currentRoom, currentRoomPath)
    const { currentRoomPath, currentRoom, userId } = loadContainerVars();

    let buffer, filename, assetId;
    let roomPath = currentRoomPath;

    // Detect if input is a file path or asset ID
    const isFilePath = assetIdOrPath.includes('/') || assetIdOrPath.includes('.');

    // Branch 1: File path mode
    if (isFilePath) {
      let filePath;
      try {
        const resolvedPath = resolveLocalDocumentPath(currentRoomPath, assetIdOrPath);
        roomPath = resolvedPath.basePath;
        filePath = resolvedPath.filePath;
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        process.exit(1);
      }

      // Read file directly
      buffer = fs.readFileSync(filePath);
      filename = path.basename(filePath);

      // Generate asset ID for saving results
      assetId = `file-${Date.now()}-${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

      console.log(`📎 Processing local file: ${filename}`);
      console.log(`   Path: ${assetIdOrPath}`);
      console.log(`   Size: ${buffer.length} bytes`);
    }
    // Branch 2: Asset ID mode (existing behavior)
    else {
      if (!roomPath) {
        console.error(`❌ Error: No currentRoomPath set in container vars`);
        process.exit(1);
      }

      // Strip "asset:" prefix if present (e.g., "asset:abc123" -> "abc123")
      assetId = assetIdOrPath.startsWith('asset:')
        ? assetIdOrPath.slice(6)
        : assetIdOrPath;

      // 3. Find asset JSON
      const assetJsonPath = findAssetJson(roomPath, assetId);
      if (!assetJsonPath) {
        console.error(`❌ Error: Could not find general-asset-image-${assetId}.json in room`);
        console.log('Make sure the asset ID is correct and exists in the current room.');
        process.exit(1);
      }

      // 4. Read asset metadata
      let assetMeta;
      try {
        assetMeta = JSON.parse(fs.readFileSync(assetJsonPath, 'utf8'));
      } catch (err) {
        console.error(`❌ Error reading asset JSON: ${err.message}`);
        process.exit(1);
      }

      const srcUrl = assetMeta.props?.src;
      if (!srcUrl) {
        console.error('❌ Error: Asset has no src URL');
        process.exit(1);
      }

      // 5. Extract upload ID from URL
      const uploadIdMatch = srcUrl.match(/\/api\/uploads\/([a-f0-9-]+)/i);
      if (!uploadIdMatch) {
        console.error('❌ Error: Could not extract upload ID from src URL');
        console.log(`URL: ${srcUrl}`);
        process.exit(1);
      }
      const uploadId = uploadIdMatch[1];

      // 6. Detect file type
      const fileType = detectFileType(assetMeta);
      console.log(`🔍 Inspecting document: ${assetId}`);
      console.log(`📄 Type detected: ${fileType}`);
      console.log(`📦 File: ${assetMeta.props?.name || 'unknown'}`);

      // 7. Fetch document from API
      const apiUrl = process.env.DOCKER_CANVAS_SYNC_URL;
      const response = await fetchDocument(apiUrl, uploadId, userId, currentRoom);

      if (!response.success) {
        console.error(`❌ Error fetching document: ${response.error}`);
        process.exit(1);
      }

      // Check file size
      if (response.size > MAX_FILE_SIZE) {
        console.error(`❌ Error: Document is too large: ${(response.size / 1024 / 1024).toFixed(2)} MB (max 50 MB)`);
        process.exit(1);
      }

      // 8. Decode base64
      buffer = Buffer.from(response.base64, 'base64');
      filename = assetMeta.props?.name || `document`;
    }

    // COMMON PATH: Both branches converge here
    // 9. Process document using shared service
    let results;
    try {
      results = await processDocument(buffer, filename, assetId, roomPath, options);
    } catch (err) {
      if (err.message.includes('Unsupported file type')) {
        console.error(`❌ Error: Unsupported file type`);
        console.log('Supported types: PDF, DOCX, images (PNG, JPG, etc.), text files');
      } else {
        console.error(`❌ Error processing document: ${err.message}`);
      }
      process.exit(1);
    }

    // 10. Save results
    const savedFiles = saveResults(roomPath, assetId, results);

    // 11. Print results
    printResults(results, savedFiles, roomPath);

  } catch (err) {
    if (err.message.includes('password')) {
      console.error('❌ Error: Document is password-protected');
      console.log('Please remove password protection and re-upload');
    } else if (err.message.includes('403')) {
      console.error('❌ Error: You don\'t have permission to access this document');
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  }
}

// Run
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: node inspect-document.js <asset_id_or_file_path> [options]');
  console.log('');
  console.log('Accepts either:');
  console.log('  - Asset ID (e.g., GM2wo-KippGsBKzYPvYv3)');
  console.log('  - File path (e.g., .chat-attachments/document.pdf)');
  console.log('');
  console.log('Default: Extracts text and metadata');
  console.log('');
  console.log('Options:');
  console.log('  --extract-images               Extract images from PDFs');
  console.log('  --extract-attachments          Extract embedded files from PDFs');
  console.log('');
  console.log('Examples:');
  console.log('  inspect document GM2wo-KippGsBKzYPvYv3');
  console.log('  inspect document .chat-attachments/report.pdf');
  console.log('  inspect document .chat-attachments/doc.pdf --extract-images');
  process.exit(0);
}

const options = parseArgs(args);

if (!options.assetIdOrPath) {
  console.error('❌ Error: Asset ID or file path is required');
  console.log('Usage: node inspect-document.js <asset_id_or_file_path>');
  process.exit(1);
}

inspectDocument(options.assetIdOrPath, options);
