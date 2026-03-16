#!/usr/bin/env node

/**
 * Unpack Canvas State Script - Room-Centric Architecture
 * 
 * Processes all canvas-state.json files in the repository recursively.
 * Each room (root or subcanvas) is processed identically and generates:
 * - Widget directories (widget-{shapeId}/) with properties.json and src/ directory
 * - Canvas metadata files (canvas-metadata.json) 
 * - Canvas-link files (canvas-link-{shapeId}.json) in parent room directories
 * 
 * Note: Storage (global-storage.json, files/) is no longer generated.
 * 
 * Usage: node unpack-canvas-state.js
 */

const fs = require('fs');
const path = require('path');
const { generateStylingMd } = require('./styling-utils');

class CanvasStateUnpacker {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.processedRooms = new Set();
    this.targetRoom = this.getTargetRoomFromContainerVars();
  }

  /**
   * Get target room from env var or container_vars.json
   */
  getTargetRoomFromContainerVars() {
    // Check env var first
    if (process.env.MIYAGI_ROOM) {
      return process.env.MIYAGI_ROOM;
    }
    // Fall back to container vars
    const containerVarsPath = '/app/container_vars.json';
    if (fs.existsSync(containerVarsPath)) {
      try {
        const containerVars = JSON.parse(fs.readFileSync(containerVarsPath, 'utf8'));
        return containerVars.currentRoom || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Main entry point
   */
  async run() {
    console.log('🚀 Starting canvas state unpacking...');
    
    if (this.targetRoom) {
      console.log(`🎯 Container vars found - will only unpack room: ${this.targetRoom}`);
    }
    
    try {
      const rootRoomName = await this.identifyRootRoom();
      const rootRoomPath = path.join(this.rootDir, rootRoomName);
      
      console.log(`🌐 Starting directory traversal from root: ${rootRoomName}`);
      await this.processRoomRecursively(rootRoomPath);
      console.log(`✅ Directory traversal completed. Processed ${this.processedRooms.size} rooms.`);

    } catch (error) {
      console.error('❌ Canvas state unpacking failed:', error);
      process.exit(1);
    }
  }

   // Identify the root room directory. Ensures there is exactly one root room in the repository
  async identifyRootRoom() {
    const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });
    const rootRoomDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('room-'))
      .map(entry => entry.name);

    if (rootRoomDirs.length === 0) {
      throw new Error('❌ No root room directory found! Expected exactly one room-* directory in repository root.');
    }

    if (rootRoomDirs.length > 1) {
      throw new Error(`❌ Multiple root room directories found: ${rootRoomDirs.join(', ')}. Expected exactly one room-* directory in repository root.`);
    }

    const rootRoomName = rootRoomDirs[0];
    return rootRoomName;
  }

  /**
   * Process a room and all its subrooms recursively
   */
  async processRoomRecursively(roomPath) {
    const roomName = path.basename(roomPath);
    
    // Skip if already processed
    if (this.processedRooms.has(roomName)) {
      return;
    }
    
    // If targeting a specific room, only process that one
    const shouldProcess = !this.targetRoom || roomName === this.targetRoom;
    
    if (shouldProcess) {
    console.log(`📍 Processing room: ${roomName} at ${roomPath}`);
    
    // Find canvas-state.json
    const canvasStateFile = this.findCanvasStateFileForRoom(roomPath);
    if (!canvasStateFile) {
      console.warn(`⚠️ No canvas-state.json found for room: ${roomName} at ${roomPath}`);
      return;
    }
    
    this.processedRooms.add(roomName);
    
    // Clean room directory before unpacking (delete all managed items)
    await this.cleanRoomDirectory(roomPath);
    
    // Unpack fresh from canvas-state.json
    await this.unpackRoom(canvasStateFile);
    }
    
    // Always traverse subrooms to find the target (if we have one and haven't found it yet)
    if (!this.targetRoom || !this.processedRooms.has(this.targetRoom)) {
    const entries = fs.readdirSync(roomPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('room-')) {
        const subroomPath = path.join(roomPath, entry.name);
        await this.processRoomRecursively(subroomPath);
        }
      }
    }
  }


  findCanvasStateFileForRoom(roomPath) {
    const canvasStatePath = path.join(roomPath, 'canvas-state.json');
    console.log(`  🔍 Looking for: ${canvasStatePath}`);
    if (fs.existsSync(canvasStatePath)) {
      return canvasStatePath;
    }
    
    return null;
  }

  /**
   * Process a single room's canvas-state.json file
   * Every room (root or subcanvas) is processed identically
   */
  async unpackRoom(canvasStateFilePath) {
    const roomDir = path.dirname(canvasStateFilePath);
    const roomName = path.basename(roomDir);
    
    console.log(`📄 Unpacking room: ${roomName} (${path.relative(this.rootDir, canvasStateFilePath)})`);

    try {
      // Read and parse this room's canvas state
      const canvasStateContent = fs.readFileSync(canvasStateFilePath, 'utf8');
      const canvasState = JSON.parse(canvasStateContent);

      // Collect metadata and buffer assets
      // Note: canvas_storage is no longer processed
      let documentData = null;
      const pages = [];
      const referencedAssetIds = new Set();
      const bufferedAssets = [];

      // Single pass: process documents, buffer assets, collect assetId references from shapes
      for (const doc of canvasState.documents || []) {
        const result = await this.processDocument(doc, roomDir, referencedAssetIds, bufferedAssets);
        if (result) {
          if (result.type === 'document') documentData = result.data;
          else if (result.type === 'page') pages.push(result.data);
        }
      }

      // Now write only referenced assets
      for (const { state, lastChangedClock } of bufferedAssets) {
        if (referencedAssetIds.has(state.id)) {
          await this.writeAsset(state, lastChangedClock, roomDir);
        }
      }

      // Generate metadata file
      await this.generateCanvasMetadata(documentData, pages, canvasState, roomDir);

      console.log(`✅ Processed room: ${roomName}`);

    } catch (error) {
      console.error(`❌ Error unpacking room ${roomName} from ${canvasStateFilePath}:`, error);
      throw error;
    }
  }

  /**
   * Main document processor - dispatches based on typeName and writes files directly
   * Assets are buffered and assetId references are collected from shapes
   * Note: canvas_storage is skipped
   */
  async processDocument(document, roomDir, referencedAssetIds, bufferedAssets) {
    const { state, lastChangedClock } = document;
    
    switch (state.typeName) {
      case 'document':
        return { type: 'document', data: state };
      case 'page':
        return { type: 'page', data: { ...state, lastChangedClock } };
      case 'canvas_storage':
        // Skip - storage is now handled by RecordRoom/Yjs
        return null;
      case 'shape':
        // Collect assetId reference if shape has one
        if (state.props?.assetId) {
          referencedAssetIds.add(state.props.assetId);
        }
        await this.unpackShape(state, lastChangedClock, roomDir);
        return null;
      case 'asset':
        // Buffer asset for later - will only write if referenced
        bufferedAssets.push({ state, lastChangedClock });
        return null;
      default:
        return null;
    }
  }

  /**
   * Unpack shape - dispatches based on shape type and writes files directly
   */
  async unpackShape(state, lastChangedClock, roomDir) {
    switch (state.type) {
      case 'miyagi-widget':
        await this.unpackMiyagiWidget(state, lastChangedClock, roomDir);
        break;
      case 'canvas-link':
        await this.unpackCanvasLink(state, lastChangedClock, roomDir);
        break;
      default:
        await this.unpackGeneralShape(state, lastChangedClock, roomDir);
    }
  }

  /**
   * Unpack miyagi-widget - creates widget directory with all files
   */
  async unpackMiyagiWidget(state, lastChangedClock, roomDir) {
    const shapeId = state.id;
    const shapeIdClean = shapeId.replace('shape:', '');
    const widgetDir = path.join(roomDir, `widget-${shapeIdClean}`);

    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    // Write properties.json
    const properties = {
      shapeId,
      widgetId: state.props?.widgetId,
      templateHandle: state.props?.templateHandle,
      templateName: state.props?.templateName,
      icon: state.props?.icon,
      position: { x: state.x, y: state.y },
      size: { w: state.props?.w, h: state.props?.h },
      rotation: state.rotation,
      opacity: state.opacity,
      isLocked: state.isLocked,
      color: state.props?.color,
      zoomScale: state.props?.zoomScale,
      isFullscreen: state.props?.isFullscreen,
      savedContentHash: state.props?.savedContentHash,
      templateDescription: state.props?.templateDescription,
      templateCategory: state.props?.templateCategory,
      meta: state.meta,
      parentId: state.parentId,
      index: state.index,
      lastChangedClock
    };
    fs.writeFileSync(path.join(widgetDir, 'properties.json'), JSON.stringify(properties, null, 2), 'utf8');

    // Write styling.md with style information
    const stylingMd = generateStylingMd(state.props?.style);
    fs.writeFileSync(path.join(widgetDir, 'styling.md'), stylingMd, 'utf8');

    // Write source files from unified sources map
    if (state.props?.sources && typeof state.props.sources === 'object') {
      for (const [relPath, code] of Object.entries(state.props.sources)) {
        const safeRel = relPath.replace(/^\/+/, '').replace(/\\/g, '/');
        const outPath = path.join(widgetDir, safeRel);
        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, String(code), 'utf8');
      }
    }

    console.log(`    🧩 Generated: ${path.relative(this.rootDir, widgetDir)}/`);
  }

  /**
   * Unpack canvas-link - writes canvas-link-{id}.json in parent directory
   */
  async unpackCanvasLink(state, lastChangedClock, roomDir) {
    const targetCanvasId = state.props?.targetCanvasId;
    if (!targetCanvasId) {
      console.warn(`⚠️ Canvas-link ${state.id} has no targetCanvasId`);
      return;
    }

    const targetRoomDir = path.join(roomDir, targetCanvasId);
    if (!fs.existsSync(targetRoomDir)) {
      console.warn(`⚠️ Target room not found: ${targetCanvasId}`);
      return;
    }

    const shapeId = state.id.replace('shape:', '');
    const canvasLinkPath = path.join(roomDir, `canvas-link-${shapeId}.json`);

    const canvasLinkData = {
      shapeId: state.id,
      targetCanvasId,
      label: state.props?.label || 'Canvas Link',
      linkType: state.props?.linkType || 'realfile',
      position: { x: state.x, y: state.y },
      size: { w: state.props?.w || 400, h: state.props?.h || 400 },
      rotation: state.rotation,
      opacity: state.opacity,
      isLocked: state.isLocked,
      meta: state.meta,
      parentId: state.parentId,
      index: state.index,
      lastChangedClock,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(canvasLinkPath, JSON.stringify(canvasLinkData, null, 2), 'utf8');
    console.log(`    🔗 Generated: ${path.relative(this.rootDir, canvasLinkPath)}`);
  }

  /**
   * Unpack general shape - writes shape-{id}.json
   */
  async unpackGeneralShape(state, lastChangedClock, roomDir) {
    const objectIdClean = state.id.replace('shape:', '');
    const objectFileName = `shape-${objectIdClean}.json`;
    const objectFilePath = path.join(roomDir, objectFileName);

    const objectData = {
      ...state,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(objectFilePath, JSON.stringify(objectData, null, 2), 'utf8');
    console.log(`    🔷 Generated: ${path.relative(this.rootDir, objectFilePath)}`);
  }

  /**
   * Write asset - writes general-asset-{type}-{id}.json (only called for referenced assets)
   */
  async writeAsset(state, lastChangedClock, roomDir) {
    const objectIdClean = state.id.replace('asset:', '');
    const objectFileName = `general-asset-${state.type}-${objectIdClean}.json`;
    const objectFilePath = path.join(roomDir, objectFileName);

    const objectData = {
      ...state,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(objectFilePath, JSON.stringify(objectData, null, 2), 'utf8');
    console.log(`    📎 Generated: ${path.relative(this.rootDir, objectFilePath)}`);
  }


  /**
   * Generate canvas-metadata.json
   */
  async generateCanvasMetadata(documentData, pages, canvasState, canvasDir) {
    const metadata = {
      document: documentData,
      pages: pages,
      schema: canvasState.schema,
      generatedAt: new Date().toISOString(),
      clock: canvasState.clock,
      documentClock: canvasState.documentClock,
      tombstones: canvasState.tombstones || {},
      tombstoneHistoryStartsAtClock: canvasState.tombstoneHistoryStartsAtClock || 1
    };

    const metadataPath = path.join(canvasDir, 'canvas-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`  📋 Generated: ${path.relative(this.rootDir, metadataPath)}`);
  }

  /**
   * Sanitize a string for use as a filename
   */
  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }


  async cleanRoomDirectory(roomPath) {
    const entries = fs.readdirSync(roomPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(roomPath, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name.startsWith('widget-')) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } else if (entry.isFile()) {
        if ((entry.name.startsWith('shape-') || 
             entry.name.startsWith('general-asset-') || 
             entry.name.startsWith('canvas-link-')) && 
            entry.name.endsWith('.json')) {
          fs.rmSync(fullPath, { force: true });
        }
      }
    }
  }
}

// Auto-execute when run directly
if (require.main === module) {
  const unpacker = new CanvasStateUnpacker();
  unpacker.run().catch(error => {
    console.error('❌ Unpack failed:', error);
    process.exit(1);
  });
}

module.exports = CanvasStateUnpacker;
