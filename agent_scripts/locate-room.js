#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Get container vars from /app/container_vars.json
 * Returns { currentRoom, userId }
 */
function getContainerVars() {
  try {
    const vars = fs.readFileSync('/app/container_vars.json', 'utf8');
    const { currentRoom, userId } = JSON.parse(vars);
    return { currentRoom, userId };
  } catch (err) {
    console.error('❌ Error reading container vars:', err.message);
    process.exit(1);
  }
}

/**
 * Find room path by room name using find command
 * Room names are unique hashes, so there should be exactly one match
 */
function findRoomPath(roomName) {
  try {
    const result = execSync(`find /app/workspace/repo -type d -name "${roomName}" 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (!result) {
      return null;
    }

    const matches = result.split('\n').filter(p => p.length > 0);

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      console.error(`❌ Error: Found multiple directories named ${roomName}:`);
      matches.forEach(m => console.error(`  - ${m}`));
      console.error('This should never happen. Room names should be unique.');
      process.exit(1);
    }

    return matches[0];
  } catch (err) {
    console.error('❌ Error finding room:', err.message);
    process.exit(1);
  }
}

/**
 * Main function
 * Usage:
 *   locate-room                    # Uses room from container_vars.json
 *   locate-room room-abc123-...    # Uses specified room ID
 */
function main() {
  const args = process.argv.slice(2);

  // Get room ID from args or container_vars.json
  let roomId;
  if (args.length > 0) {
    roomId = args[0];
  } else {
    const { currentRoom } = getContainerVars();
    roomId = currentRoom;
  }

  // Find the room path
  const roomPath = findRoomPath(roomId);

  if (!roomPath) {
    console.error(`❌ Error: Room not found: ${roomId}`);
    console.error('Make sure the room exists under /app/workspace/repo/');
    process.exit(1);
  }

  // Output just the path (so it can be used in scripts)
  console.log(roomPath);
}

main();
