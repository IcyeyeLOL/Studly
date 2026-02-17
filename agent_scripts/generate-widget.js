#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { IndexValidator } = require('./index-validator');
const { defaultSizeForTemplate, computePlacement, collectRoomWidgetRectangles } = require('./widget-positioning');
const { generateStylingMd } = require('./styling-utils');
const { SOURCE_EXTENSIONS, ROOT_LEVEL_WIDGET_FILES, BASE_TEMPLATE_DIR } = require('./widget-constants');

/**
 * Generate a random shape ID similar to tldraw's format with template handle prefix
 * @param {string} templateHandle - Template handle to prefix the shape ID with
 * @returns {string} Shape ID like "shape:notepad-Y59wm6acnQvwpBlp"
 */
function generateShapeId(templateHandle) {
  // Generate 16 character random string similar to tldraw format
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format: shape:templateHandle-uniqueId (matches frontend and backend)
  return `shape:${templateHandle}-${result}`;
}

/**
 * Read page ID from canvas metadata
 * @param {string} roomPath - The absolute path to the room directory
 * @returns {string} The page ID from canvas metadata, or 'page:page' as fallback
 */
function getPageIdFromMetadata(roomPath) {
  try {
    const metadataPath = path.join(roomPath, 'canvas-metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (metadata.pages && metadata.pages.length > 0) {
        return metadata.pages[0].id;
      }
    }
  } catch (error) {
    console.warn('Warning: Could not read canvas metadata, using default page ID');
  }
  return 'page:page'; // fallback
}

/**
 * Get the canvas mode for a room by reading canvas metadata
 * @param {string} roomPath - The absolute path to the room directory
 * @returns {string} Canvas mode: 'dock' or 'canvas' (default)
 */
function getCanvasMode(roomPath) {
  try {
    const metadataPath = path.join(roomPath, 'canvas-metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const canvasMode = metadata?.canvas?.canvasMode || metadata?.canvasMode || 'freeform';
      // Normalize to 'canvas' for freeform/default mode (desktop mode deprecated)
      return canvasMode === 'dock' ? 'dock' : 'canvas';
    }
  } catch (error) {
    console.warn('Warning: Could not read canvas metadata to detect canvas mode, defaulting to canvas');
  }
  return 'canvas';
}

/**
 * Get the next index for a new widget by finding all existing widget indices in the room
 * Uses IndexValidator for proper index generation
 * @param {string} roomPath - The path to the room directory
 * @returns {string} The next index to use for the new widget
 */
function getNextWidgetIndex(roomPath) {
  const validator = new IndexValidator();
  return validator.getNextWidgetIndex(roomPath);
}

/**
 * Recursively read all files from a directory, returning paths relative to a base.
 * Skips node_modules, dist, .wrangler, and declaration files.
 * @param {string} dir - The directory to read
 * @param {string} relBase - The relative path prefix
 * @returns {Array<{relativePath: string, absolutePath: string}>}
 */
function readSourceFiles(dir, relBase = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = relBase ? path.join(relBase, entry.name) : entry.name;

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.wrangler'].includes(entry.name)) continue;
      results.push(...readSourceFiles(abs, rel));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SOURCE_EXTENSIONS.has(ext)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      results.push({ relativePath: rel, absolutePath: abs });
    }
  }
  return results;
}

/**
 * Copy the base template files into a widget directory.
 * Reads all source files from the synced template's src/ directory
 * plus root-level widget-owned files (like tailwind.config.js).
 *
 * @param {string} widgetDir - The widget directory to populate
 * @returns {number} Number of files copied
 */
function copyTemplateSources(widgetDir) {
  const srcDir = path.join(BASE_TEMPLATE_DIR, 'src');
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Base template src/ not found at ${srcDir}`);
    process.exit(1);
  }

  const files = readSourceFiles(srcDir, 'src');
  let count = 0;

  for (const { relativePath, absolutePath } of files) {
    const destPath = path.join(widgetDir, relativePath);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(absolutePath, destPath);
    count++;
  }

  // Copy root-level widget-owned files
  for (const filename of ROOT_LEVEL_WIDGET_FILES) {
    const srcPath = path.join(BASE_TEMPLATE_DIR, filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(widgetDir, filename));
      count++;
    }
  }

  return count;
}

/**
 * Generate widget directory and files
 * @param {string} templateHandle - Template handle (required)
 * @param {string} roomPath - The path to the room directory (optional)
 */
function generateWidget(templateHandle, roomPath) {
  if (!templateHandle) {
    console.error('Error: templateHandle is required');
    console.log('Usage: node generate-widget.js <templateHandle> [roomPath]');
    console.log('Arguments:');
    console.log('  templateHandle - The template handle (e.g., my-widget)');
    console.log('  roomPath       - The path to the room directory (optional)');
    console.log('                   If not provided, uses current room from container vars');
    console.log('Example: node generate-widget.js my-template /path/to/room-12345');
    console.log('Note: If no roomPath provided, uses current room from container vars');
    process.exit(1);
  }

  // Read container vars for room and style info
  let containerVars = {};
  try {
    containerVars = JSON.parse(fs.readFileSync('/app/container_vars.json', 'utf8'));
  } catch (error) {
    // File may not exist yet, that's ok if roomPath is provided
  }

  // Get current style from container vars (may be null)
  const currentStyle = containerVars.currentStyle || null;
  if (currentStyle) {
    console.log(`🎨 Using style: ${currentStyle.name} (${currentStyle.id})`);
  }

  // If no roomPath provided, use currentRoomPath from container vars
  if (!roomPath) {
    roomPath = containerVars.currentRoomPath;
    if (!roomPath) {
      console.error('Error: No roomPath provided and no currentRoomPath set in container vars');
      console.log('Either provide roomPath as second argument or ensure current room is set');
      process.exit(1);
    }

    console.log(`✅ Found room at: ${roomPath}`);
  }

  // Validate that the room path exists
  if (!fs.existsSync(roomPath)) {
    console.error(`Error: Room directory does not exist: ${roomPath}`);
    process.exit(1);
  }

  if (!fs.statSync(roomPath).isDirectory()) {
    console.error(`Error: Room path is not a directory: ${roomPath}`);
    process.exit(1);
  }

  // Extract room ID from the path
  const roomId = path.basename(roomPath);

  // Get the page ID from canvas metadata
  const pageId = getPageIdFromMetadata(roomPath);
  
  const rectangles = collectRoomWidgetRectangles(roomPath);
  const shapeId = generateShapeId(templateHandle);
  // Calculate the next index for this widget
  const nextIndex = getNextWidgetIndex(roomPath);
  const defaultSize = defaultSizeForTemplate(templateHandle);
  
  const widgetId = `${templateHandle}_${Date.now()}`;
  const dirName = `widget-${shapeId.replace('shape:', '')}`;
  
  // Create widget directory in the specified room directory
  const dirPath = path.join(roomPath, dirName);

  console.log(`Creating widget directory: ${dirName}`);
  console.log(`Room Path: ${roomPath}`);
  console.log(`Room ID: ${roomId}`);
  console.log(`Page ID: ${pageId}`);
  console.log(`Shape ID: ${shapeId}`);
  console.log(`Widget Index: ${nextIndex}`);
  console.log(`Template Handle: ${templateHandle}`);

  // Create directory
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.warn(`Directory ${dirName} already exists, files will be overwritten`);
  }

  // Copy source files from the base template
  console.log(`🧩 Copying base template source files...`);
  const fileCount = copyTemplateSources(dirPath);
  console.log(`   Copied ${fileCount} source files from base template`);

  // Create properties.json
  const canvasMode = getCanvasMode(roomPath);
  const placement = computePlacement(rectangles, defaultSize, { mode: canvasMode });

  const propertiesJson = {
    shapeId: shapeId,
    widgetId: widgetId,
    templateHandle: templateHandle,
    position: {
        x: placement.position.x,
        y: placement.position.y
    },
    size: {
      w: placement.size.w,
      h: placement.size.h
    },
    rotation: 0,
    opacity: 1,
    isLocked: false,
    color: "black",
    zoomScale: 1,
    savedContentHash: "initial",
    meta: {
      initializationState: "ready"
    },
    parentId: pageId,
    index: nextIndex,
    lastChangedClock: 1676
  };

  // Write files
  try {
    fs.writeFileSync(path.join(dirPath, 'properties.json'), JSON.stringify(propertiesJson, null, 2));

    // Create styling.md with style information
    const stylingMd = generateStylingMd(currentStyle);
    fs.writeFileSync(path.join(dirPath, 'styling.md'), stylingMd);

    console.log('\n✅ Widget files created successfully:');
    console.log(`📁 Directory: ${dirPath}`);
    console.log(`📄 src/       - ${fileCount} source files from base template`);
    console.log(`📄 properties.json - Widget properties and metadata`);
    console.log(`📄 styling.md - Widget style configuration`);
    console.log(`\n🎯 Next steps:`);
    console.log(`1. Edit src/App.tsx to implement your widget logic.`);
    console.log(`2. Commit changes. Hooks will bundle and update canvas-state automatically.`);
    console.log(`3. Shape ID: ${shapeId}`);

  } catch (error) {
    console.error('Error creating files:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const templateHandle = args[0];
const roomPath = args[1]; // Optional

// Run the generator
generateWidget(templateHandle, roomPath);
