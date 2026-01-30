#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Delete a widget directory and all its contents
 * @param {string} widgetDir - The widget directory name (e.g., 'widget-64jTHevUBL9azUJZ')
 */
function deleteWidget(widgetDir) {
  if (!widgetDir) {
    console.error('Error: Widget directory name is required');
    console.log('Usage: node delete-widget.js <widgetDir>');
    console.log('Arguments:');
    console.log('  widgetDir - The widget directory name to delete');
    console.log('Example: node delete-widget.js widget-64jTHevUBL9azUJZ');
    console.log('Note: Uses current room from container vars to find the room directory');
    process.exit(1);
  }

  // Get current room from container vars
  const containerVars = JSON.parse(fs.readFileSync('/app/container_vars.json', 'utf8'));
  const currentRoom = containerVars.currentRoom;
  if (!currentRoom) {
    console.error('Error: No current room set in container vars');
    console.log('Ensure current room is set before deleting widgets');
    process.exit(1);
  }

  // Get room path from container vars
  const roomPath = containerVars.currentRoomPath;
  if (!roomPath) {
    console.error(`Error: No currentRoomPath set in container vars`);
    process.exit(1);
  }

  console.log(`✅ Found room at: ${roomPath}`);

  // Construct the widget path
  const widgetPath = path.join(roomPath, widgetDir);

  // Validate that the widget path exists
  if (!fs.existsSync(widgetPath)) {
    console.error(`Error: Widget directory does not exist: ${widgetPath}`);
    process.exit(1);
  }

  // Validate that this is actually a widget directory
  const dirName = path.basename(widgetPath);
  if (!dirName.startsWith('widget-')) {
    console.error(`Error: Directory does not appear to be a widget directory (should start with 'widget-'): ${dirName}`);
    process.exit(1);
  }

  // Additional validation - check if it contains expected widget files
  const expectedFiles = ['properties.json', 'storage.json', 'template.jsx'];
  const hasWidgetFiles = expectedFiles.some(file => fs.existsSync(path.join(widgetPath, file)));
  
  if (!hasWidgetFiles) {
    console.warn(`Warning: Directory ${dirName} doesn't contain expected widget files, but proceeding with deletion...`);
  }

  // Get widget info before deletion for logging
  const roomId = path.basename(roomPath);
  
  console.log(`Deleting widget directory: ${dirName}`);
  console.log(`Room Path: ${roomPath}`);
  console.log(`Room ID: ${roomId}`);
  console.log(`Widget Path: ${widgetPath}`);

  try {
    // List files that will be deleted
    const files = fs.readdirSync(widgetPath);
    console.log('\n📁 Files to be deleted:');
    files.forEach(file => {
      const filePath = path.join(widgetPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        console.log(`📄 ${file}`);
      } else if (stats.isDirectory()) {
        console.log(`📁 ${file}/`);
      }
    });

    // Recursively delete the widget directory
    fs.rmSync(widgetPath, { recursive: true, force: true });

    console.log('\n✅ Widget deleted successfully!');
    console.log(`🗑️  Removed: ${widgetPath}`);
    console.log(`\n🎯 Widget ${dirName} has been completely removed from ${roomId}`);

  } catch (error) {
    console.error('❌ Error deleting widget:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const widgetDir = args[0];

// Run the deletion
deleteWidget(widgetDir);
