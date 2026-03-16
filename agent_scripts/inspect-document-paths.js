const path = require('path');

const WORK_DIR = '/app/workspace/repo';

function resolveDocumentBasePath(currentRoomPath) {
  if (typeof currentRoomPath === 'string' && currentRoomPath.length > 0) {
    return currentRoomPath;
  }

  return WORK_DIR;
}

function isPathInsideBasePath(basePath, targetPath) {
  const relativePath = path.relative(basePath, targetPath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

function resolveLocalDocumentPath(currentRoomPath, assetIdOrPath) {
  const basePath = resolveDocumentBasePath(currentRoomPath);
  const filePath = path.resolve(basePath, assetIdOrPath);

  if (!isPathInsideBasePath(basePath, filePath)) {
    throw new Error('File path outside the allowed base path (security check failed)');
  }

  return { basePath, filePath };
}

module.exports = {
  WORK_DIR,
  resolveDocumentBasePath,
  resolveLocalDocumentPath,
  isPathInsideBasePath,
};
