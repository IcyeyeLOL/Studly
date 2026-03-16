#!/usr/bin/env node

/**
 * Widget Code Validator
 *
 * Scans JSX files for mcapi.get() and mcapi.post() calls,
 * validates that endpoints exist in McAPI.yaml.
 *
 * Usage:
 *   node validate-widget-code.js <roomPath>
 *
 * Returns:
 *   Exit 0 if all validations pass
 *   Exit 1 if any errors found (prints JSON to stdout)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to McAPI.yaml (relative to this script's location in agent_scripts/)
const MCAPI_YAML_PATH = path.resolve(__dirname, '../../src/prompts/McAPI.yaml');

/**
 * Parse McAPI.yaml and extract all valid endpoint paths.
 * Uses simple regex parsing since we only need endpoint values.
 */
function loadValidEndpoints(yamlPath) {
  const endpoints = new Set();

  try {
    const content = fs.readFileSync(yamlPath, 'utf8');

    // Match lines like: endpoint: /foo-bar or endpoint: /foo/{param}
    const endpointPattern = /^\s*endpoint:\s*([^\s#]+)/gm;
    let match;

    while ((match = endpointPattern.exec(content)) !== null) {
      let endpoint = match[1].trim();

      // Remove quotes if present
      endpoint = endpoint.replace(/^['"]|['"]$/g, '');

      // Normalize: ensure leading slash
      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }

      // Store base endpoint (without path params for matching)
      // e.g., /upscale-status/{taskId} -> /upscale-status/
      const baseEndpoint = endpoint.replace(/\{[^}]+\}/g, '');

      endpoints.add(endpoint);
      if (baseEndpoint !== endpoint) {
        // Also store pattern-based version for dynamic routes
        endpoints.add(baseEndpoint);
      }
    }

    console.log(`📚 Loaded ${endpoints.size} valid endpoints from McAPI.yaml`);
    return endpoints;

  } catch (err) {
    console.error(`❌ Failed to load McAPI.yaml: ${err.message}`);
    return new Set();
  }
}

/**
 * Normalize an endpoint string from code to match McAPI.yaml format.
 * Handles various patterns found in widget code:
 *   - '/api/integrations/generate-text' -> '/generate-text'
 *   - 'generate-text' -> '/generate-text'
 *   - '/generate-text' -> '/generate-text'
 */
function normalizeEndpoint(endpoint) {
  let normalized = endpoint.trim();

  // Remove quotes
  normalized = normalized.replace(/^['"`]|['"`]$/g, '');

  // Strip full URL prefix variations
  normalized = normalized.replace(/^\/api\/integrations\//, '/');
  normalized = normalized.replace(/^api\/integrations\//, '/');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  return normalized;
}

/**
 * Check if an endpoint matches a valid endpoint (handles dynamic routes).
 */
function isEndpointValid(endpoint, validEndpoints) {
  const normalized = normalizeEndpoint(endpoint);

  // Direct match
  if (validEndpoints.has(normalized)) {
    return true;
  }

  // Check for dynamic route matches (e.g., /upscale-status/abc123 matches /upscale-status/{taskId})
  for (const validEndpoint of validEndpoints) {
    if (validEndpoint.includes('{')) {
      // Convert /foo/{param}/bar to regex /foo/[^/]+/bar
      const pattern = validEndpoint.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(normalized)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get changed JSX/TSX files from git status within a room directory.
 * Only returns files that are modified, added, or have unstaged changes.
 * @param {string} roomDir - The room directory path
 * @returns {string[]} Array of absolute paths to changed JSX/TSX files
 */
function getChangedJsxFiles(roomDir) {
  try {
    // Get the git root directory
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: roomDir,
      encoding: 'utf8'
    }).trim();

    // Get both staged and unstaged changes, showing individual files in untracked directories
    const output = execSync('git status --porcelain -uall', {
      cwd: roomDir,
      encoding: 'utf8'
    });

    const changedFiles = [];
    console.log('🔍 Git Root:', gitRoot);
    console.log('🔍 Room Dir:', roomDir);
    console.log('🔍 Git Status:', output);
    const lines = output.split('\n').filter(Boolean);

    for (const line of lines) {
      // Format: "XY filename" where X=staged status, Y=unstaged status
      // We care about: M (modified), A (added), ? (untracked)
      const status = line.substring(0, 2);
      const filePath = line.substring(3);

      // Skip deleted files
      if (status.includes('D')) continue;

      // Only include JSX/TSX files
      if (!filePath.match(/\.(jsx|tsx)$/)) continue;

      const absolutePath = path.resolve(gitRoot, filePath);

      // Only include files within the room directory
      if (absolutePath.startsWith(roomDir + path.sep)) {
        changedFiles.push(absolutePath);
      }
    }

    return changedFiles;
  } catch (err) {
    console.warn(`⚠️ Failed to get git status: ${err.message}`);
    return null; // Return null to signal fallback to full scan
  }
}

/**
 * Find all JSX files in widget directories of a room.
 * Only searches widget-* directories, not subrooms (room-*).
 */
function findJsxFiles(roomDir) {
  const jsxFiles = [];

  if (!fs.existsSync(roomDir)) {
    return jsxFiles;
  }

  // Get direct children of the room directory
  const roomEntries = fs.readdirSync(roomDir, { withFileTypes: true });

  // Only process widget-* directories, skip room-* (subrooms) and other directories
  const widgetDirs = roomEntries.filter(e =>
    e.isDirectory() && e.name.startsWith('widget-')
  );

  function walkWidgetDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Within a widget, recurse into subdirectories (components/, utils/, etc.)
        // but skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkWidgetDir(fullPath);
        }
      } else if (entry.isFile() && /\.(jsx|js|tsx|ts)$/.test(entry.name)) {
        jsxFiles.push(fullPath);
      }
    }
  }

  // Search within each widget directory
  for (const widgetDir of widgetDirs) {
    const widgetPath = path.join(roomDir, widgetDir.name);
    walkWidgetDir(widgetPath);
  }

  return jsxFiles;
}

/**
 * Extract mcapi calls from file content.
 * Returns array of { endpoint, method, line, column }
 */
function extractApiCalls(content, filePath) {
  const calls = [];
  const lines = content.split('\n');

  // Pattern matches:
  //   mcapi.post('/endpoint', ...)
  //   mcapi.get("endpoint", ...)
  //   miyagiAPI.post('/endpoint', ...) (legacy)
  //   await mcapi.post('/endpoint', ...)
  const pattern = /(?:mcapi|miyagiAPI)\.(get|post)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  let lineNum = 0;
  for (const line of lines) {
    lineNum++;
    let match;

    // Reset lastIndex for each line
    pattern.lastIndex = 0;

    while ((match = pattern.exec(line)) !== null) {
      calls.push({
        method: match[1].toUpperCase(),
        endpoint: match[2],
        line: lineNum,
        column: match.index + 1,
        file: filePath
      });
    }
  }

  return calls;
}

/**
 * Validate widget code in a room directory.
 * Optimized to only validate files changed according to git status.
 * Falls back to full scan if git status fails.
 * Returns { endpoints: { invalid: [...] }, filesScanned: number }
 */
async function validateRoom(roomPath, validEndpoints) {
  const result = {
    endpoints: { invalid: [] },
    filesScanned: 0
  };

  if (!fs.existsSync(roomPath)) {
    console.warn(`⚠️ Room path does not exist: ${roomPath}`);
    return result;
  }

  // Try to get only changed files first (optimization)
  let jsxFiles = getChangedJsxFiles(roomPath);
  let scanMode = 'changed';

  if (jsxFiles === null || jsxFiles.length === 0) {
    if (jsxFiles === null) {
      // Git status failed - fallback to full scan
      console.log(`⚠️ Git status unavailable, falling back to full scan`);
      jsxFiles = findJsxFiles(roomPath);
      scanMode = 'full';
    } else {
      // No changed JSX files - nothing to validate
      console.log(`✓ No changed JSX files in ${path.basename(roomPath)}, skipping validation`);
      return result;
    }
  }

  result.filesScanned = jsxFiles.length;
  console.log(`🔍 Scanning ${jsxFiles.length} ${scanMode} files in ${path.basename(roomPath)}...`);

  // Process all files for endpoint validation
  for (const file of jsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relativeFile = path.relative(roomPath, file);

      // Endpoint validation
      const apiCalls = extractApiCalls(content, file);
      for (const call of apiCalls) {
        if (!isEndpointValid(call.endpoint, validEndpoints)) {
          result.endpoints.invalid.push({
            ...call,
            normalizedEndpoint: normalizeEndpoint(call.endpoint),
            relativeFile
          });
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to validate ${file}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Format endpoint validation errors for agent prompt.
 */
function formatEndpointErrors(invalid) {
  if (invalid.length === 0) return null;

  const lines = ['The following mcapi calls use invalid endpoints that do not exist in McAPI.yaml:\n'];

  for (const call of invalid) {
    lines.push(`  ❌ ${call.relativeFile}:${call.line} - mcapi.${call.method.toLowerCase()}('${call.endpoint}')`);
    lines.push(`     Normalized: '${call.normalizedEndpoint}' is not a valid endpoint\n`);
  }

  lines.push('\nPlease fix these by:');
  lines.push('1. Reading McAPI.yaml to find the correct endpoint names');
  lines.push('2. Updating the mcapi calls to use valid endpoints');
  lines.push('3. If the functionality is not available, implement an alternative approach');

  return lines.join('\n');
}


// Main execution when run as script
if (require.main === module) {
  const roomPath = process.argv[2];

  if (!roomPath) {
    console.error('Usage: node validate-widget-code.js <roomPath>');
    process.exit(1);
  }

  const validEndpoints = loadValidEndpoints(MCAPI_YAML_PATH);

  validateRoom(roomPath, validEndpoints).then(result => {
    console.log(`\n📊 Validation Results:`);
    console.log(`   Files scanned: ${result.filesScanned}`);
    console.log(`   Invalid endpoint calls: ${result.endpoints.invalid.length}`);

    if (result.endpoints.invalid.length > 0) {
      console.log('\n' + formatEndpointErrors(result.endpoints.invalid));
      console.log('\n--- JSON OUTPUT ---');
      console.log(JSON.stringify({
        success: false,
        endpoints: result.endpoints
      }, null, 2));
      process.exit(1);
    } else {
      console.log('\n✅ All widget code validations passed!');
      process.exit(0);
    }
  }).catch(err => {
    console.error(`❌ Validation failed: ${err.message}`);
    process.exit(1);
  });
}

// Export for use as module
module.exports = {
  loadValidEndpoints,
  normalizeEndpoint,
  isEndpointValid,
  findJsxFiles,
  extractApiCalls,
  validateRoom,
  formatEndpointErrors,
  MCAPI_YAML_PATH
};
