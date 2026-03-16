#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { resolveMimeTypeAndExtension } = require('../../src/file-signatures');

/**
 * Upload a local file to R2 and get a permanent URL.
 *
 * Usage: node upload-file.js <file-path> [--content-type <mime>]
 *
 * The file path is resolved relative to the current room path.
 * Returns a permanent URL that can be used in widget code.
 */

const WORK_DIR = '/app/workspace/repo';

/**
 * Load container variables (userId, currentRoomPath)
 */
function loadContainerVars() {
  try {
    const containerVars = JSON.parse(fs.readFileSync('/app/container_vars.json', 'utf8'));
    const currentRoomPath = containerVars.currentRoomPath;
    const userId = containerVars.userId;

    if (!userId) {
      console.error('❌ Error: No userId set in container vars');
      process.exit(1);
    }
    if (!currentRoomPath) {
      console.error('❌ Error: No currentRoomPath set in container vars');
      process.exit(1);
    }

    return { currentRoomPath, userId };
  } catch (err) {
    console.error('❌ Error reading container vars:', err.message);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    filePath: null,
    contentType: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--content-type' && i + 1 < args.length) {
      options.contentType = args[++i];
    } else if (!options.filePath) {
      options.filePath = arg;
    }
  }

  return options;
}

/**
 * Detect MIME type from file bytes first, then filename as fallback
 */
function detectContentType(fileBuffer, filename) {
  return resolveMimeTypeAndExtension(fileBuffer, null, filename).mimeType;
}

/**
 * Upload file to R2 via the API
 */
async function uploadFile(fileBuffer, filePath, contentType, userId) {
  const { signInternalRequestBody } = require('/app/src/internal-auth');

  const apiUrl = process.env.DOCKER_CANVAS_SYNC_URL;
  if (!apiUrl) {
    console.error('❌ Error: DOCKER_CANVAS_SYNC_URL not set');
    process.exit(1);
  }

  const base64 = fileBuffer.toString('base64');
  const filename = path.basename(filePath);

  const body = {
    userId,
    base64,
    contentType,
    filename,
  };

  const { payload, headers } = await signInternalRequestBody(body);

  const url = `${apiUrl}/api/agent/upload-file`;

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
    return { success: true, url: json.url, assetId: json.assetId };
  } catch (e) {
    return { success: false, error: `Invalid response: ${e.message}` };
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node upload-file.js <file-path> [--content-type <mime>]');
    console.log('');
    console.log('Upload a local file to R2 and get a permanent URL.');
    console.log('File path is resolved relative to the current room.');
    console.log('');
    console.log('Options:');
    console.log('  --content-type <mime>   Override auto-detected MIME type');
    console.log('');
    console.log('Examples:');
    console.log('  upload file .chat-attachments/photo.png');
    console.log('  upload file .chat-attachments/report.pdf --content-type application/pdf');
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.filePath) {
    console.error('❌ Error: File path is required');
    console.log('Usage: upload file <path> [--content-type <mime>]');
    process.exit(1);
  }

  const { currentRoomPath, userId } = loadContainerVars();

  // Resolve path: try relative to room first, then relative to workDir
  let resolvedPath = path.resolve(currentRoomPath, options.filePath);
  if (!fs.existsSync(resolvedPath)) {
    resolvedPath = path.resolve(WORK_DIR, options.filePath);
  }

  // Security: validate path is within the work directory
  if (!resolvedPath.startsWith(WORK_DIR)) {
    console.error('❌ Error: File path is outside the workspace (security check failed)');
    process.exit(1);
  }

  // Check file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${options.filePath}`);
    console.error(`   Tried: ${path.resolve(currentRoomPath, options.filePath)}`);
    console.error(`   Tried: ${path.resolve(WORK_DIR, options.filePath)}`);
    process.exit(1);
  }

  // Check file size
  const stats = fs.statSync(resolvedPath);
  if (stats.size > 50 * 1024 * 1024) {
    console.error(`❌ Error: File too large (${(stats.size / 1024 / 1024).toFixed(1)} MB, max 50 MB)`);
    process.exit(1);
  }

  // Detect or use provided content type
  const fileBuffer = fs.readFileSync(resolvedPath);
  const contentType = options.contentType || detectContentType(fileBuffer, resolvedPath);
  const filename = path.basename(resolvedPath);

  console.log(`📤 Uploading: ${filename}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`   Type: ${contentType}`);

  const result = await uploadFile(fileBuffer, resolvedPath, contentType, userId);

  if (!result.success) {
    console.error(`❌ Upload failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ Upload successful!`);
  console.log(`🔗 ${result.url}`);
  console.log('');
  console.log('Use this URL in widget code:');
  console.log(`  <img src="${result.url}" />`);
}

main();
