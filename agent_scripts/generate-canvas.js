/**
 * Canvas State Generation Script - Room-Centric Architecture
 * 
 * True inverse of unpack-canvas-state.js
 * Processes each room directory independently and generates canvas-state.json files
 * in their proper locations (root + all room-ROOMID subdirectories)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { IndexValidator } = require('./index-validator');
const { parseStylingMd } = require('./styling-utils');
const { SOURCE_EXTENSIONS, ROOT_LEVEL_WIDGET_FILES } = require('./widget-constants');

class CanvasStateGenerator {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  /**
   * Main entry point - generates canvas-state.json for all rooms
   */
  async run() {
    console.log('🎨 Starting canvas state generation...');
    
    try {
      // Find all room directories (root + room-*)
      const roomDirs = this.findRoomDirectories(this.rootDir);
      console.log(`📁 Found ${roomDirs.length} room directories to process`);

      // STEP 1: Validate and fix invalid widget indices across all rooms
      console.log('\n🔍 Step 1: Validating and fixing widget indices...');
      const validator = new IndexValidator();
      let totalFixed = 0;
      
      for (const roomDir of roomDirs) {
        const result = validator.validateAndFixRoomIndices(roomDir);
        totalFixed += result.fixed.length;
      }
      
      console.log(`✅ Index validation complete: ${totalFixed} invalid indices fixed\n`);

      // STEP 2: Generate canvas-state.json for each room independently
      console.log('🎨 Step 2: Generating canvas states...');
      let totalGenerated = 0;
      for (const roomDir of roomDirs) {
        const success = await this.generateRoomCanvasState(roomDir);
        if (success) totalGenerated++;
      }

      console.log(`\n✅ Canvas state generation completed successfully!`);
      console.log(`📊 Generated ${totalGenerated}/${roomDirs.length} canvas-state.json files`);
      return totalGenerated > 0;
      
    } catch (error) {
      console.error('❌ Canvas state generation failed:', error);
      return false;
    }
  }

  /**
   * Find all room directories recursively
   * Returns all directories that should contain canvas-state.json
   * Source of truth: directory naming convention (all room-* directories only)
   * 
   * If container_vars.json exists with currentRoom, only returns that room (and subrooms)
   */
  findRoomDirectories(rootDir) {
    const roomDirs = [];
    
    const searchRecursively = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      // Process all room-* subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('room-')) {
          const roomPath = path.join(currentDir, entry.name);
          roomDirs.push(roomPath);
          // Recursively search for nested room-* directories
          searchRecursively(roomPath);
        }
      }
    };
    
    searchRecursively(rootDir);

    // Check if we should filter to a specific room (env var or Docker container vars)
    let targetRoom = process.env.MIYAGI_ROOM || null;
    
    if (!targetRoom) {
      const containerVarsPath = '/app/container_vars.json';
      if (fs.existsSync(containerVarsPath)) {
        try {
          const containerVars = JSON.parse(fs.readFileSync(containerVarsPath, 'utf8'));
          targetRoom = containerVars.currentRoom || null;
        } catch (e) {
          // ignore
        }
      }
    }

    if (targetRoom) {
      console.log(`🎯 Filtering to room: ${targetRoom}`);
      
      const filtered = roomDirs.filter(roomPath => 
        roomPath.endsWith(`/${targetRoom}`)
      );
      
      if (filtered.length > 0) {
        return filtered;
      }
      console.log(`⚠️ Target room ${targetRoom} not found, processing all rooms`);
    }

    return roomDirs;
  }

  /**
   * Generate canvas-state.json for a single room
   */
  async generateRoomCanvasState(roomDir) {
    const roomName = path.basename(roomDir);
    console.log(`📄 Generating canvas state for room: ${roomName}`);

    try {
      // Step 1: Load room metadata
      const canvasMetadata = await this.loadCanvasMetadata(roomDir);
      
      if (!canvasMetadata) {
        console.log(`⚠️ No canvas metadata found in ${roomName} - skipping`);
        return false;
      }

      // Step 2: Load widgets from widget-* directories
      const widgets = await this.loadRoomWidgets(roomDir);

      // Step 3: Load general objects (shapes, assets, canvas-links) from *-*.json files
      const { generalObjects, canvasLinks } = await this.loadGeneralObjects(roomDir);

      // Step 4: Ensure all subrooms have canvas-links (auto-create if missing) -- WE CAN BRING THIS BACK IF WE OBSERVE CANVAS LINKS DISAPPEARING
      // await this.ensureCanvasLinksForSubrooms(roomDir, canvasLinks, canvasMetadata);

      // Step 5: Generate tldraw RoomSnapshot
      // Note: canvas_storage is no longer generated - storage is handled by RecordRoom/Yjs
      const roomSnapshot = this.generateRoomSnapshot({
        canvasMetadata,
        widgets,
        canvasLinks,
        generalObjects
      });

      // Step 6: Write canvas-state.json to this room directory
      const canvasStatePath = path.join(roomDir, 'canvas-state.json');
      fs.writeFileSync(canvasStatePath, JSON.stringify(roomSnapshot, null, 2), 'utf8');
      
      console.log(`✅ Generated canvas-state.json for ${roomName} with ${widgets.length} widgets, ${canvasLinks.length} canvas-links, and ${generalObjects.length} general objects`);
      return true;

    } catch (error) {
      console.error(`❌ Error generating canvas state for room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Load canvas-metadata.json for a room
   */
  async loadCanvasMetadata(roomDir) {
    const metadataPath = path.join(roomDir, 'canvas-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (error) {
      console.error(`❌ Error loading canvas-metadata.json from ${roomDir}:`, error);
      return null;
    }
  }

  /**
   * Load all widgets from widget-* directories in a room
   */
  async loadRoomWidgets(roomDir) {
    const entries = fs.readdirSync(roomDir, { withFileTypes: true });
    const shapeDirectories = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('widget-'))
      .map(entry => entry.name);

    console.log(`  🧩 Found ${shapeDirectories.length} widget directories in ${path.basename(roomDir)}`);

    const widgets = [];

    for (const shapeDir of shapeDirectories) {
      const widget = await this.loadWidget(roomDir, shapeDir);
      if (widget) {
        widgets.push(widget);
      }
    }

    return widgets;
  }

  // SOURCE_EXTENSIONS and ROOT_LEVEL_WIDGET_FILES imported from ./widget-constants.js

  /**
   * Load a single widget from widget-* directory.
   * Reads all source files from the src/ subdirectory into a unified sources map.
   */
  async loadWidget(roomDir, shapeDir) {
    const widgetDir = path.join(roomDir, shapeDir);
    const shapeId = shapeDir.replace('widget-', 'shape:');
    
    try {
      // Load properties
      const propertiesPath = path.join(widgetDir, 'properties.json');
      const properties = fs.existsSync(propertiesPath) 
        ? JSON.parse(fs.readFileSync(propertiesPath, 'utf8')) 
        : null;

      // Read styling.md if it exists
      const stylingPath = path.join(widgetDir, 'styling.md');
      let styleFromMd = null;
      if (fs.existsSync(stylingPath)) {
        const stylingContent = fs.readFileSync(stylingPath, 'utf8');
        styleFromMd = parseStylingMd(stylingContent);
      }

      // Collect all source files into a unified map.
      // Scans src/ directory recursively for all editable file types.
      const sources = {};
      const collectSources = (dir, relBase = '') => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const abs = path.join(dir, entry.name);
          const rel = relBase ? path.join(relBase, entry.name) : entry.name;
          
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            collectSources(abs, rel);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!SOURCE_EXTENSIONS.has(ext)) continue;
            if (entry.name.endsWith('.d.ts')) continue;
            
            try {
              sources[rel] = fs.readFileSync(abs, 'utf8');
            } catch (e) {
              console.warn(`⚠️ Failed to read source file ${rel}:`, e.message);
            }
          }
        }
      };
      
      // Collect from src/ directory (new format)
      const srcDir = path.join(widgetDir, 'src');
      if (fs.existsSync(srcDir)) {
        collectSources(srcDir, 'src');
      }

      // Collect root-level widget-owned files (e.g. tailwind.config.js)
      for (const filename of ROOT_LEVEL_WIDGET_FILES) {
        const filePath = path.join(widgetDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            sources[filename] = fs.readFileSync(filePath, 'utf8');
          } catch (e) {
            console.warn(`⚠️ Failed to read root-level file ${filename}:`, e.message);
          }
        }
      }
      
      if (Object.keys(sources).length > 0) {
        console.log(`      📦 Collected ${Object.keys(sources).length} source files: ${Object.keys(sources).join(', ')}`);
      }

      // Properties and sources are required
      if (!properties || Object.keys(sources).length === 0) {
        console.log(`⚠️ Skipping incomplete widget: ${shapeDir}`);
        return null;
      }

      return {
        shapeId,
        properties,
        sources,
        ...(styleFromMd ? { style: styleFromMd } : {})
      };

    } catch (error) {
      console.error(`❌ Error loading widget ${shapeDir}:`, error);
      return null;
    }
  }


  // Load all general objects from shape-*.json, general-asset-*.json, and canvas-link-*.json files in a room
  async loadGeneralObjects(roomDir) {
    const entries = fs.readdirSync(roomDir, { withFileTypes: true });
    const generalObjectFiles = entries
      .filter(entry => entry.isFile() && 
        (entry.name.startsWith('shape-') || 
         entry.name.startsWith('general-asset-') || 
         entry.name.startsWith('canvas-link-')) && 
        entry.name.endsWith('.json'))
      .map(entry => entry.name);

    console.log(`  🔷 Found ${generalObjectFiles.length} general object files in ${path.basename(roomDir)}`);

    const generalObjects = [];
    const canvasLinks = [];

    for (const objectFile of generalObjectFiles) {
      const generalObject = await this.loadGeneralObject(roomDir, objectFile);
      if (generalObject) {
        // Separate canvas-links from other general objects
        if (objectFile.startsWith('canvas-link-')) {
          canvasLinks.push(generalObject);
        } else {
          generalObjects.push(generalObject);
        }
      }
    }

    return { generalObjects, canvasLinks };
  }

  // Load a single general object from shape-*.json, general-asset-*.json, or canvas-link-*.json file
  async loadGeneralObject(roomDir, objectFileName) {
    const objectFilePath = path.join(roomDir, objectFileName);
    
    try {
      const objectData = JSON.parse(fs.readFileSync(objectFilePath, 'utf8'));
      const { generatedAt, ...cleanObjectState } = objectData;
      
      // Canvas-links need to be converted from flat format to tldraw shape format
      if (objectFileName.startsWith('canvas-link-')) {
        const shapeId = cleanObjectState.shapeId || 'shape:' + objectFileName.replace('canvas-link-', '').replace('.json', '');
        const { lastChangedClock, ...flatData } = cleanObjectState;
        
        // Validate that target room exists
        const targetRoomDir = path.join(roomDir, flatData.targetCanvasId);
        if (!fs.existsSync(targetRoomDir)) {
          console.warn(`  ⚠️ Skipping canvas-link ${shapeId}: target room not found: ${flatData.targetCanvasId}`);
          return null;
        }
        
        // Convert from flat unpack format to tldraw shape format
        return {
          shapeId,
          properties: {
            id: shapeId,
            typeName: 'shape',
            type: 'canvas-link',
            parentId: flatData.parentId || 'page:page',
            index: flatData.index || 'a1',
            x: flatData.position?.x || 0,
            y: flatData.position?.y || 0,
            rotation: flatData.rotation || 0,
            isLocked: flatData.isLocked || false,
            opacity: flatData.opacity || 1,
            meta: flatData.meta || {},
            props: {
              w: flatData.size?.w || 400,
              h: flatData.size?.h || 400,
              targetCanvasId: flatData.targetCanvasId,
              label: flatData.label || 'Canvas Link',
              linkType: flatData.linkType || 'realfile',
              targetSpaceType: flatData.targetSpaceType || 'freeform'
            }
          },
          lastChangedClock: lastChangedClock || 0
        };
      }
      
      return cleanObjectState;

    } catch (error) {
      console.error(`❌ Error loading general object ${objectFileName}:`, error);
      return null;
    }
  }

  /**
   * Ensure all subroom directories have corresponding canvas-links
   * Auto-creates missing canvas-links to prevent orphaned rooms
   */
  async ensureCanvasLinksForSubrooms(roomDir, canvasLinks, canvasMetadata) {
    const entries = fs.readdirSync(roomDir, { withFileTypes: true });
    const subrooms = entries.filter(e => e.isDirectory() && e.name.startsWith('room-'));
    
    if (subrooms.length === 0) {
      return; // No subrooms, nothing to check
    }

    console.log(`  🔍 Checking ${subrooms.length} subrooms for missing canvas-links...`);

    // Get the correct page ID from metadata
    const pageId = canvasMetadata?.pages?.[0]?.id || 'page:page';

    for (const subroom of subrooms) {
      const hasLink = canvasLinks.some(link => 
        link.properties?.props?.targetCanvasId === subroom.name
      );
      
      if (!hasLink) {
        console.log(`  ⚠️  Missing canvas-link for ${subroom.name}, auto-creating...`);
        
        // Generate unique shape ID
        const shapeId = this.generateShapeId();
        
        // Get label from subroom metadata
        const label = await this.getSubroomLabel(path.join(roomDir, subroom.name)) || `Canvas ${subroom.name.substring(5, 13)}`;
        
        // Create canvas-link data matching unpack format
        const canvasLinkData = {
          shapeId: `shape:${shapeId}`,
          targetCanvasId: subroom.name,
          label: label,
          linkType: 'realfile',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          rotation: 0,
          opacity: 1,
          isLocked: false,
          meta: {},
          parentId: pageId,
          index: 'a1',
          generatedAt: new Date().toISOString()
        };
        
        // Write canvas-link file
        const canvasLinkPath = path.join(roomDir, `canvas-link-${shapeId}.json`);
        fs.writeFileSync(canvasLinkPath, JSON.stringify(canvasLinkData, null, 2), 'utf8');
        
        // Reload it using the same loader to ensure consistent format and strip generatedAt
        const loadedCanvasLink = await this.loadGeneralObject(roomDir, `canvas-link-${shapeId}.json`);
        if (loadedCanvasLink) {
          canvasLinks.push(loadedCanvasLink);
        }
        
        console.log(`  ✅ Created canvas-link for ${subroom.name}`);
      }
    }
  }

  /**
   * Generate a unique shape ID
   */
  generateShapeId() {
    // Generate 16-character random ID similar to tldraw's format
    return crypto.randomBytes(8).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 16);
  }

  /**
   * Get label for subroom from its metadata
   */
  async getSubroomLabel(subroomPath) {
    const metadataPath = path.join(subroomPath, 'canvas-metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      return metadata.canvas?.canvasName || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate tldraw RoomSnapshot from room data
   * Note: canvas_storage is no longer generated
   */
  generateRoomSnapshot(roomData) {
    const { canvasMetadata, widgets, canvasLinks, generalObjects } = roomData;
    
    // Use complete document and pages from metadata
    const documentState = canvasMetadata.document;
    const pages = canvasMetadata.pages;
    const pageId = pages[0].id;
    
    const documents = [
      // Document record
      {
        state: documentState,
        lastChangedClock: canvasMetadata?.documentClock || 2
      },
      // Page records
      ...pages.map(page => {
        const { lastChangedClock, ...state } = page;
        return {
          state,
          lastChangedClock: lastChangedClock || 0
        };
      })
    ];

    // Add widget shape records
    let shapeIndex = 1;
    for (const widget of widgets) {
      const props = widget.properties;
      
      const widgetDocument = {
        state: {
          id: props.shapeId || props.id || widget.shapeId,
          typeName: 'shape',
          type: 'miyagi-widget',
          parentId: props.parentId || pageId,
          index: props.index || `a${shapeIndex}`,
          x: props.position?.x || props.x || 0,
          y: props.position?.y || props.y || 0,
          rotation: props.rotation || 0,
          isLocked: props.isLocked || false,
          opacity: props.opacity || 1,
          meta: props.meta || { initializationState: 'ready' },
          props: {
            w: props.size?.w || props.w || 300,
            h: props.size?.h || props.h || 200,
            widgetId: props.widgetId || `${props.templateHandle || 'widget'}_${Date.now()}`,
            templateHandle: props.templateHandle || 'notepad-react-test',
            ...(props.templateName ? { templateName: props.templateName } : {}),
            ...(props.icon ? { icon: props.icon } : {}),
            sources: widget.sources,
            ...(props.isFullscreen !== undefined ? { isFullscreen: props.isFullscreen } : {}),
            ...(props.savedContentHash !== undefined ? { savedContentHash: props.savedContentHash } : {}),
            color: props.color || 'black',
            zoomScale: props.zoomScale || 1,
            ...(widget.style ? { style: widget.style } : {}),
            ...(props.templateDescription ? { templateDescription: props.templateDescription } : {}),
            ...(props.templateCategory ? { templateCategory: props.templateCategory } : {})
          }
        },
        lastChangedClock: props.lastChangedClock || (shapeIndex + 2)
      };

      documents.push(widgetDocument);
      shapeIndex++;
    }

    // Add canvas-link shape records
    for (const canvasLink of canvasLinks) {
      const linkDocument = {
        state: canvasLink.properties,
        lastChangedClock: canvasLink.lastChangedClock || (shapeIndex + 2)
      };
      documents.push(linkDocument);
      shapeIndex++;
    }

    for (const generalObject of generalObjects) {
      const generalObjectDocument = {
        state: generalObject,
        lastChangedClock: generalObject.lastChangedClock || (shapeIndex + 2)
      };
      documents.push(generalObjectDocument);
      shapeIndex++;
    }

    // Use existing metadata values or calculate defaults
    const totalClock = canvasMetadata?.clock || (documents.length + 1);

    return {
      clock: totalClock,
      documentClock: canvasMetadata?.documentClock || totalClock,
      tombstones: canvasMetadata?.tombstones || {},
      tombstoneHistoryStartsAtClock: canvasMetadata?.tombstoneHistoryStartsAtClock || 1,
      schema: canvasMetadata.schema,
      documents: documents
    };
  }
}

// Auto-execute
if (require.main === module) {
  try {
    const generator = new CanvasStateGenerator();
    generator.run().then(success => {
      if (success) {
        console.log('✅ Canvas state generation completed successfully');
        process.exit(0);
      } else {
        console.log('⚠️ Canvas state generation failed');
        process.exit(1);
      }
    }).catch(error => {
      console.error('❌ Error during canvas state generation:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to initialize canvas state generator:', error);
    process.exit(1);
  }
}

module.exports = CanvasStateGenerator;
